import * as Network from 'expo-network';
import TcpSocket from 'react-native-tcp-socket';

/**
 * Detecção REAL de câmeras IP na rede local.
 *
 * Sem mocks: faz varredura TCP de toda a sub-rede procurando portas
 * tipicamente usadas por câmeras/DVR/NVR (RTSP, HTTP, ONVIF e portas
 * proprietárias de fabricantes) e faz fingerprint via banner HTTP.
 *
 * IMPORTANTE: usa react-native-tcp-socket (módulo nativo) — só funciona
 * em build nativo (APK/dev-client), não no Expo Go nem na web.
 */

// Portas típicas de câmeras/gravadores e o serviço associado
export const CAMERA_PORTS: { port: number; service: string; weight: number }[] = [
  { port: 554, service: 'RTSP', weight: 0.5 },       // stream de vídeo (forte indício)
  { port: 8554, service: 'RTSP-alt', weight: 0.45 },
  { port: 80, service: 'HTTP', weight: 0.15 },
  { port: 8080, service: 'HTTP-alt', weight: 0.2 },
  { port: 8000, service: 'HTTP-cam', weight: 0.25 },
  { port: 88, service: 'HTTP-cam', weight: 0.3 },     // comum em câmeras chinesas
  { port: 8899, service: 'ONVIF/DVR', weight: 0.35 },
  { port: 34567, service: 'Dahua/Sofia (DVR)', weight: 0.5 },
  { port: 37777, service: 'Dahua (DVR/NVR)', weight: 0.5 },
  { port: 9000, service: 'HTTP-cam', weight: 0.25 },
];

// Palavras-chave de fabricantes/firmwares de câmera em banners HTTP
const VENDOR_SIGNATURES: { keyword: RegExp; vendor: string }[] = [
  { keyword: /hikvision|dvrdvs|dnvrs|webs/i, vendor: 'Hikvision' },
  { keyword: /dahua|webservice|sonia/i, vendor: 'Dahua' },
  { keyword: /axis/i, vendor: 'Axis' },
  { keyword: /reolink/i, vendor: 'Reolink' },
  { keyword: /foscam|ipcam|netwave/i, vendor: 'Foscam/IPCam' },
  { keyword: /goahead|boa\/|webcamxp|server: webs/i, vendor: 'Câmera genérica (GoAhead/Boa)' },
  { keyword: /uc-httpd/i, vendor: 'Câmera genérica (uc-httpd)' },
  { keyword: /hipcam|realtek/i, vendor: 'Câmera genérica (Realtek)' },
  { keyword: /nvr|dvr/i, vendor: 'DVR/NVR' },
];

export interface CameraDevice {
  ip: string;
  openPorts: { port: number; service: string }[];
  vendor: string | null;
  banner: string | null;
  confidence: number; // 0-1, heurística
  rttMs: number;      // menor tempo de resposta observado
  firstSeen: number;
}

export interface ScanProgress {
  scanned: number;
  total: number;
  currentIp: string;
  found: number;
}

export class CameraDetectionService {
  private devices: Map<string, CameraDevice> = new Map();
  private scanning = false;

  isScanning(): boolean {
    return this.scanning;
  }

  getDevices(): CameraDevice[] {
    return Array.from(this.devices.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }

  clear(): void {
    this.devices.clear();
  }

  /**
   * Descobre a sub-rede local a partir do IP do aparelho.
   * Retorna algo como "192.168.1".
   */
  async getSubnet(): Promise<{ deviceIp: string; subnet: string } | null> {
    try {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) return null;
      const deviceIp = await Network.getIpAddressAsync();
      if (!deviceIp || !deviceIp.includes('.') || deviceIp.startsWith('127.')) {
        return null;
      }
      const subnet = deviceIp.split('.').slice(0, 3).join('.');
      return { deviceIp, subnet };
    } catch {
      return null;
    }
  }

  /**
   * Testa se uma porta TCP está aberta (conexão real).
   */
  private checkPort(
    host: string,
    port: number,
    timeout = 1000
  ): Promise<number | null> {
    return new Promise((resolve) => {
      const start = Date.now();
      let settled = false;
      const finish = (open: boolean) => {
        if (settled) return;
        settled = true;
        try {
          socket.destroy();
        } catch {}
        resolve(open ? Date.now() - start : null);
      };

      // connectTimeout limita o tempo do connect() nativo; ele é o LIMITE real.
      // Sem ele o módulo usa 0 = infinito, travando threads em hosts inexistentes.
      const socket = TcpSocket.createConnection(
        { host, port, connectTimeout: timeout } as any,
        () => finish(true)
      );
      socket.on('error', () => finish(false));
      socket.on('timeout', () => finish(false));
      // Backstop grande: NÃO deve preemptar o evento connect/error legítimo,
      // que pode chegar atrasado pelo bridge sob carga. Só dispara se o nativo
      // travar de vez.
      setTimeout(() => finish(false), timeout + 4000);
    });
  }

  /**
   * Tenta ler o banner/Server header HTTP para fingerprint de fabricante.
   */
  private async fingerprint(ip: string, port: number): Promise<{ vendor: string | null; banner: string | null }> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);
      const scheme = port === 443 ? 'https' : 'http';
      const res = await fetch(`${scheme}://${ip}:${port}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(t);
      const server = res.headers.get('server') || '';
      const wwwAuth = res.headers.get('www-authenticate') || '';
      let bodySnippet = '';
      try {
        bodySnippet = (await res.text()).slice(0, 400);
      } catch {}
      const haystack = `${server} ${wwwAuth} ${bodySnippet}`;
      const match = VENDOR_SIGNATURES.find((s) => s.keyword.test(haystack));
      return {
        vendor: match ? match.vendor : null,
        banner: server || wwwAuth || null,
      };
    } catch {
      return { vendor: null, banner: null };
    }
  }

  /**
   * Varre um único host em todas as portas de câmera.
   */
  private async scanHost(ip: string): Promise<CameraDevice | null> {
    const openPorts: { port: number; service: string }[] = [];
    let confidence = 0;
    let minRtt = Number.MAX_SAFE_INTEGER;

    for (const { port, service, weight } of CAMERA_PORTS) {
      const rtt = await this.checkPort(ip, port);
      if (rtt !== null) {
        openPorts.push({ port, service });
        confidence += weight;
        if (rtt < minRtt) minRtt = rtt;
      }
    }

    if (openPorts.length === 0) return null;

    // Fingerprint via primeira porta HTTP aberta
    const httpPort = openPorts.find((p) =>
      [80, 8080, 8000, 88, 9000, 443].includes(p.port)
    );
    let vendor: string | null = null;
    let banner: string | null = null;
    if (httpPort) {
      const fp = await this.fingerprint(ip, httpPort.port);
      vendor = fp.vendor;
      banner = fp.banner;
      if (vendor) confidence += 0.3; // fabricante confirmado sobe a confiança
    }

    return {
      ip,
      openPorts,
      vendor,
      banner,
      confidence: Math.min(confidence, 1),
      rttMs: minRtt === Number.MAX_SAFE_INTEGER ? 0 : minRtt,
      firstSeen: Date.now(),
    };
  }

  /**
   * Executa a varredura real da rede local.
   * onProgress é chamado a cada host varrido.
   */
  async scanNetwork(
    onProgress?: (p: ScanProgress) => void,
    concurrency = 10
  ): Promise<CameraDevice[]> {
    if (this.scanning) return this.getDevices();
    this.scanning = true;
    this.clear();

    try {
      const net = await this.getSubnet();
      if (!net) {
        throw new Error(
          'Sem rede Wi-Fi/LAN válida. Conecte-se a uma rede local para escanear.'
        );
      }

      console.log(`[scan] deviceIp=${net.deviceIp} subnet=${net.subnet}.0/24`);
      const hosts: string[] = [];
      for (let i = 1; i <= 254; i++) hosts.push(`${net.subnet}.${i}`);

      let scanned = 0;
      let found = 0;
      let index = 0;

      const worker = async () => {
        while (index < hosts.length) {
          const ip = hosts[index++];
          const device = await this.scanHost(ip);
          scanned++;
          if (device) {
            this.devices.set(ip, device);
            found++;
            console.log(
              `[scan] ENCONTRADA ${ip} portas=${device.openPorts
                .map((p) => p.port)
                .join(',')} vendor=${device.vendor} conf=${device.confidence}`
            );
          }
          onProgress?.({ scanned, total: hosts.length, currentIp: ip, found });
        }
      };

      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);

      return this.getDevices();
    } finally {
      this.scanning = false;
    }
  }

  getStats() {
    const devices = this.getDevices();
    return {
      total: devices.length,
      highConfidence: devices.filter((d) => d.confidence >= 0.6).length,
      withVendor: devices.filter((d) => d.vendor).length,
      rtspDevices: devices.filter((d) =>
        d.openPorts.some((p) => p.port === 554 || p.port === 8554)
      ).length,
    };
  }
}

export default new CameraDetectionService();
