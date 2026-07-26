/**
 * Validação REAL da lógica do scanner de câmeras IP.
 *
 * Sobe uma "câmera falsa" (servidor HTTP com header de fabricante + porta
 * "RTSP") em localhost e roda o MESMO algoritmo do CameraDetectionService
 * (checkPort via TCP real + fingerprint via HTTP real) contra ela.
 *
 * Prova que a detecção é real: só encontra portas que estão de fato abertas,
 * identifica o fabricante pelo banner e ignora portas fechadas.
 *
 * (No app usa-se react-native-tcp-socket; aqui usamos o módulo net do Node,
 *  que faz exatamente a mesma conexão TCP.)
 */
const net = require('net');
const http = require('http');

const CAMERA_PORTS = [
  { port: 554, service: 'RTSP', weight: 0.5 },
  { port: 8554, service: 'RTSP-alt', weight: 0.45 },
  { port: 80, service: 'HTTP', weight: 0.15 },
  { port: 8080, service: 'HTTP-alt', weight: 0.2 },
  { port: 8000, service: 'HTTP-cam', weight: 0.25 },
  { port: 88, service: 'HTTP-cam', weight: 0.3 },
  { port: 8899, service: 'ONVIF/DVR', weight: 0.35 },
  { port: 34567, service: 'Dahua/Sofia (DVR)', weight: 0.5 },
  { port: 37777, service: 'Dahua (DVR/NVR)', weight: 0.5 },
  { port: 9000, service: 'HTTP-cam', weight: 0.25 },
];

const VENDOR_SIGNATURES = [
  { keyword: /hikvision|dvrdvs|dnvrs|webs/i, vendor: 'Hikvision' },
  { keyword: /dahua|webservice|sonia/i, vendor: 'Dahua' },
  { keyword: /axis/i, vendor: 'Axis' },
  { keyword: /reolink/i, vendor: 'Reolink' },
  { keyword: /foscam|ipcam|netwave/i, vendor: 'Foscam/IPCam' },
  { keyword: /goahead|boa\/|webcamxp|server: webs/i, vendor: 'Câmera genérica (GoAhead/Boa)' },
  { keyword: /uc-httpd/i, vendor: 'Câmera genérica (uc-httpd)' },
  { keyword: /nvr|dvr/i, vendor: 'DVR/NVR' },
];

function checkPort(host, port, timeout = 800) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const socket = new net.Socket();
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open ? Date.now() - start : null);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
    socket.connect(port, host);
  });
}

function fingerprint(host, port) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/', timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c.toString()));
      res.on('end', () => {
        const server = res.headers['server'] || '';
        const wwwAuth = res.headers['www-authenticate'] || '';
        const haystack = `${server} ${wwwAuth} ${body.slice(0, 400)}`;
        const match = VENDOR_SIGNATURES.find((s) => s.keyword.test(haystack));
        resolve({ vendor: match ? match.vendor : null, banner: server || wwwAuth || null });
      });
    });
    req.on('error', () => resolve({ vendor: null, banner: null }));
    req.on('timeout', () => { req.destroy(); resolve({ vendor: null, banner: null }); });
  });
}

async function scanHost(ip) {
  const openPorts = [];
  let confidence = 0;
  let minRtt = Number.MAX_SAFE_INTEGER;
  for (const { port, service, weight } of CAMERA_PORTS) {
    const rtt = await checkPort(ip, port);
    if (rtt !== null) {
      openPorts.push({ port, service });
      confidence += weight;
      if (rtt < minRtt) minRtt = rtt;
    }
  }
  if (openPorts.length === 0) return null;
  const httpPort = openPorts.find((p) => [80, 8080, 8000, 88, 9000, 443].includes(p.port));
  let vendor = null, banner = null;
  if (httpPort) {
    const fp = await fingerprint(ip, httpPort.port);
    vendor = fp.vendor;
    banner = fp.banner;
    if (vendor) confidence += 0.3;
  }
  return { ip, openPorts, vendor, banner, confidence: Math.min(confidence, 1), rttMs: minRtt };
}

async function main() {
  console.log('=== Validação REAL do scanner de câmeras IP ===\n');

  // 1) Sobe uma "câmera falsa": HTTP na 8080 com header Hikvision + "RTSP" na 554
  const camHttp = http.createServer((req, res) => {
    res.setHeader('Server', 'Hikvision-Webs');
    res.setHeader('WWW-Authenticate', 'Digest realm="IP Camera"');
    res.end('<html><title>Network Camera</title></html>');
  });
  camHttp.on('clientError', () => {});
  camHttp.on('connection', (s) => s.on('error', () => {}));
  const camRtsp = net.createServer((s) => {
    s.on('error', () => {});
    s.end('RTSP/1.0 200 OK\r\n');
  });
  camRtsp.on('error', () => {});

  await new Promise((r) => camHttp.listen(8080, '127.0.0.1', r));
  await new Promise((r) => camRtsp.listen(8554, '127.0.0.1', r));
  console.log('Câmera FALSA no ar em 127.0.0.1 (HTTP:8080 + RTSP-alt:8554)\n');

  // 2) Escaneia um host COM câmera e um host SEM nada
  console.log('-> Escaneando 127.0.0.1 (tem câmera falsa)...');
  const withCam = await scanHost('127.0.0.1');
  console.log(JSON.stringify(withCam, null, 2));

  console.log('\n-> Escaneando 127.0.0.2 (nada rodando / porta fechada)...');
  const noCam = await scanHost('127.0.0.2');
  console.log(noCam === null ? 'null (nada detectado — correto!)' : JSON.stringify(noCam));

  camHttp.close();
  camRtsp.close();

  // 3) Veredito
  console.log('\n=== VERDITO ===');
  const ok1 = withCam && withCam.openPorts.some((p) => p.port === 8554)
    && withCam.openPorts.some((p) => p.port === 8080);
  const ok2 = withCam && withCam.vendor === 'Hikvision';
  const ok3 = noCam === null;
  console.log(`[${ok1 ? 'PASS' : 'FAIL'}] Detectou portas reais abertas (8554 + 8080)`);
  console.log(`[${ok2 ? 'PASS' : 'FAIL'}] Identificou fabricante pelo banner (Hikvision)`);
  console.log(`[${ok3 ? 'PASS' : 'FAIL'}] NÃO deu falso positivo em host sem câmera`);
  console.log(`\nConfiança calculada p/ a câmera: ${withCam ? (withCam.confidence * 100).toFixed(0) + '%' : 'N/A'}`);
  const allOk = ok1 && ok2 && ok3;
  console.log(`\n${allOk ? '✅ Scanner REAL validado — detecção baseada em portas de verdade.' : '❌ Falhou.'}`);
  process.exit(allOk ? 0 : 1);
}

main();
