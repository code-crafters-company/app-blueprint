/**
 * "Câmera IP falsa" para teste ponta-a-ponta.
 * Sobe um servidor HTTP (com banner de fabricante Hikvision) e um listener
 * TCP simulando RTSP. O emulador Android alcança o host em 10.0.2.2, que
 * está dentro da sub-rede 10.0.2.x que o app escaneia.
 */
const http = require('http');
const net = require('net');

const HTTP_PORT = 8080;
const RTSP_PORT = 8554;

const camHttp = http.createServer((req, res) => {
  res.setHeader('Server', 'Hikvision-Webs');
  res.setHeader('WWW-Authenticate', 'Digest realm="IP Camera(Hikvision)"');
  res.end('<html><head><title>Network Camera</title></head><body>DS-2CD</body></html>');
});
camHttp.on('clientError', () => {});
camHttp.on('connection', (s) => s.on('error', () => {}));

const camRtsp = net.createServer((s) => {
  s.on('error', () => {});
  s.end('RTSP/1.0 200 OK\r\nServer: Hikvision\r\n\r\n');
});
camRtsp.on('error', () => {});

camHttp.listen(HTTP_PORT, '0.0.0.0', () =>
  console.log(`[fake-camera] HTTP (Hikvision) em 0.0.0.0:${HTTP_PORT}`)
);
camRtsp.listen(RTSP_PORT, '0.0.0.0', () =>
  console.log(`[fake-camera] RTSP em 0.0.0.0:${RTSP_PORT}`)
);
console.log('Câmera falsa ativa. Emulador a alcança em 10.0.2.2. Ctrl+C para parar.');
