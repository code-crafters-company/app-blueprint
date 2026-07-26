/**
 * Simulação de validação do CameraDetectionService.
 *
 * Objetivo: verificar se o app REALMENTE detecta câmeras em um ambiente
 * fechado de "verdade conhecida" (ground truth), rodando a mesma lógica
 * de detecção do app várias vezes e comparando com a realidade.
 *
 * Reimplementa fielmente a lógica de src/services/CameraDetectionService.ts
 * (a parte de rede é stubada, pois expo-network não roda em Node puro).
 */

// ---- Lógica de detecção copiada 1:1 do serviço do app ----
function detectIRCameras() {
  const out = [];
  const irCount = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
  for (let i = 0; i < irCount; i++) {
    const distance = 1 + Math.random() * 4;
    out.push({ type: 'IR', confidence: 0.7 + Math.random() * 0.3, distance });
  }
  return out;
}
function detectLensReflection() {
  const out = [];
  const n = Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0;
  for (let i = 0; i < n; i++) {
    const distance = 0.5 + Math.random() * 3;
    out.push({ type: 'ML', confidence: 0.6 + Math.random() * 0.3, distance });
  }
  return out;
}
function detectRFCameras() {
  const out = [];
  const n = Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0;
  for (let i = 0; i < n; i++) {
    const distance = 2 + Math.random() * 3;
    out.push({ type: 'RF', confidence: 0.65 + Math.random() * 0.3, distance });
  }
  return out;
}
function detectNetworkCameras() {
  // No app: pega IP real e testa 4 IPs fixos com 30% de chance CADA.
  // A "detecção" NÃO depende de haver câmera real na rede.
  const out = [];
  const commonIPs = ['x.1', 'x.100', 'x.200', 'x.254'];
  for (const ip of commonIPs) {
    if (Math.random() > 0.7) {
      const distance = 1 + Math.random() * 4;
      out.push({ type: 'Network', confidence: 0.85 + Math.random() * 0.15, distance, ip });
    }
  }
  return out;
}
function performHybridScan() {
  return [
    ...detectIRCameras(),
    ...detectLensReflection(),
    ...detectNetworkCameras(),
    ...detectRFCameras(),
  ];
}

// ---- Cenários de "ambiente fechado" com verdade conhecida ----
function runScenario(name, groundTruthCameras, runs = 1000) {
  let scansComDeteccao = 0;
  let totalDetectado = 0;
  const porTipo = { IR: 0, ML: 0, RF: 0, Network: 0 };

  for (let i = 0; i < runs; i++) {
    const d = performHybridScan();
    if (d.length > 0) scansComDeteccao++;
    totalDetectado += d.length;
    for (const c of d) porTipo[c.type]++;
  }

  console.log(`\n=== Cenário: ${name} ===`);
  console.log(`Câmeras REAIS no ambiente (ground truth): ${groundTruthCameras}`);
  console.log(`Varreduras executadas: ${runs}`);
  console.log(`Varreduras que "detectaram" ≥1 câmera: ${scansComDeteccao} (${(100*scansComDeteccao/runs).toFixed(1)}%)`);
  console.log(`Média de câmeras "detectadas" por varredura: ${(totalDetectado/runs).toFixed(2)}`);
  console.log(`Detecções por tipo:`, porTipo);

  // Avaliação vs. verdade
  if (groundTruthCameras === 0 && scansComDeteccao > 0) {
    console.log(`>>> RESULTADO: ${scansComDeteccao} FALSOS POSITIVOS em um ambiente sem NENHUMA câmera.`);
  }
  if (groundTruthCameras > 0) {
    console.log(`>>> RESULTADO: as "detecções" acima são idênticas ao cenário vazio — o app ignora as ${groundTruthCameras} câmeras reais.`);
  }
  return { scansComDeteccao, totalDetectado };
}

console.log('#############################################################');
console.log('# VALIDAÇÃO: o app detecta câmeras em ambiente fechado?      #');
console.log('#############################################################');

// Ambiente 1: quarto fechado e VAZIO (0 câmeras). Detecção honesta = 0.
const vazio = runScenario('Quarto fechado VAZIO', 0, 2000);

// Ambiente 2: quarto fechado com 3 câmeras reais. Detecção honesta = pega as 3.
const cheio = runScenario('Quarto fechado com 3 câmeras REAIS', 3, 2000);

console.log('\n#############################################################');
console.log('# CONCLUSÃO                                                  #');
console.log('#############################################################');
console.log(`Ambiente VAZIO  -> detectou em ${(100*vazio.scansComDeteccao/2000).toFixed(1)}% das varreduras`);
console.log(`Ambiente CHEIO  -> detectou em ${(100*cheio.scansComDeteccao/2000).toFixed(1)}% das varreduras`);
console.log('As duas taxas são ESTATISTICAMENTE IGUAIS porque a saída');
console.log('vem de Math.random(), não do ambiente. O app NÃO detecta');
console.log('câmeras reais — ele gera detecções fictícias.');
