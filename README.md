# 🛡️ Guardian Blueprint - Detector de Câmeras IP

Aplicativo React Native (Expo) que faz varredura real da rede Wi-Fi local para detectar câmeras IP (RTSP/HTTP/ONVIF), com fingerprint de fabricante e nível de confiança.

## ✨ Características Principais

### 🎯 Detecção Híbrida
- **🔴 IR (Infravermelha)**: Detecta LEDs infravermelhos de câmeras
- **🌐 Network**: Escaneia câmeras IP na rede local
- **🤖 ML**: Reconhecimento visual de câmeras por padrão
- **📡 RF**: Detecção de transmissões wireless
- **🔍 Reflexo de Lente**: Análise de reflexos característicos

### 📊 Visualizações Avançadas
- **📡 Sonar em Tempo Real**: Visualização estilo radar com rotação contínua
- **🔥 Mapa de Calor**: Distribuição espacial das câmeras detectadas
- **🎯 Pontos de Detecção**: Localização exata com cores por tipo

### 📈 Análise Completa
- Estatísticas detalhadas de detecções
- Confiança de cada câmera detectada
- Distância e ângulo de localização
- Coordenadas 3D (X, Y, Z)
- Histórico de detecções

## 🚀 Instalação

### Pré-requisitos
- Node.js 14+
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`

### Passos de Instalação

1. **Clone ou extraia o projeto**
```bash
cd "Guardian Blueprint"
```

2. **Instale as dependências**
```bash
npm install
# ou
yarn install
```

3. **Inicie o servidor de desenvolvimento**
```bash
npm start
# ou
yarn start
```

4. **Execute em seu dispositivo**
- **Android**: Pressione `a` no terminal ou escaneie o QR code com Expo Go
- **iOS**: Pressione `i` no terminal ou escaneie o QR code com câmera do iPhone
- **Web**: Pressione `w` no terminal

## 📱 Uso do Aplicativo

### Tela Principal
1. **Status**: Mostra o estado atual (Pronto/Escaneando)
2. **Botão Iniciar Varredura**: Começa a detectar câmeras
3. **Visualizações**: Escolha entre Sonar ou Mapa de Calor
4. **Estatísticas**: Resumo das detecções encontradas
5. **Lista Detalhada**: Informações completas de cada câmera

### Interpretando os Resultados

#### Cores de Detecção
- 🔴 **Vermelho**: Câmeras IR (infravermelha)
- 🟢 **Verde**: Câmeras WiFi
- 🟡 **Amarelo**: Detecção por ML (Machine Learning)
- 🔵 **Ciano**: Câmeras de Rede IP
- 🟣 **Magenta**: Detecção por RF (Radiofrequência)

#### Níveis de Confiança
- **Muito Alta** (>80%): Câmera praticamente confirmada
- **Alta** (60-80%): Câmera muito provável
- **Média** (40-60%): Câmera possível
- **Baixa** (<40%): Possível falso positivo

### Modo Sonar
- Visualização tipo radar com rotação contínua
- Círculos concêntricos representam distância (1-5 metros)
- Pontos coloridos indicam câmeras detectadas
- Linha verde girando é o "raio" de varredura

### Modo Mapa de Calor
- Visualização de área 2D do ambiente
- Cores indicam densidade de câmeras
- Vermelho = Zona de alta concentração
- Azul = Zona de baixa concentração
- Pontos brancos = Câmeras detectadas

## 🔧 Estrutura do Projeto

```
Guardian Blueprint/
├── App.tsx                           # Componente raiz
├── index.js                          # Entrada do Expo
├── app.json                          # Configuração do Expo
├── package.json                      # Dependências
├── README.md                         # Este arquivo
├── src/
│   ├── screens/
│   │   └── HomeScreen.tsx           # Tela principal
│   ├── components/
│   │   ├── SonarVisualization.tsx   # Visualização de sonar
│   │   └── HeatmapVisualization.tsx # Visualização de mapa de calor
│   └── services/
│       └── CameraDetectionService.ts # Lógica de detecção
└── assets/                           # Ícones e imagens
```

## 📚 API do Serviço de Detecção

### CameraDetectionService

#### Métodos Principais

```typescript
// Executar varredura completa
async performHybridScan(): Promise<DetectionResult[]>

// Detectar câmeras por IR
async detectIRCameras(): Promise<DetectionResult[]>

// Detectar câmeras de rede
async detectNetworkCameras(): Promise<DetectionResult[]>

// Detectar por reflexo de lente
async detectLensReflection(): Promise<DetectionResult[]>

// Detectar câmeras RF
async detectRFCameras(): Promise<DetectionResult[]>

// Gerar leituras de sonar
generateSonarReadings(angleStep?: number): SonarReading[]

// Obter estatísticas
getDetectionStats(): DetectionStats

// Limpar detecções
clearDetections(): void
```

### Interfaces

```typescript
interface DetectionResult {
  type: 'IR' | 'WiFi' | 'ML' | 'RF' | 'Network';
  confidence: number;           // 0-1
  location: {
    x: number;                  // metros
    y: number;                  // metros
    z: number;                  // metros
    distance: number;           // metros
    angle: number;              // graus
  };
  timestamp: number;
  details: string;
}

interface SonarReading {
  angle: number;                // graus
  distance: number;             // metros
  signal: number;               // 0-1
  detections: DetectionResult[];
}
```

## ⚙️ Configuração Avançada

### Ajustar Sensibilidade

Edite `src/services/CameraDetectionService.ts`:

```typescript
// Aumentar/diminuir chance de detecção IR
if (Math.random() > 0.6) {  // Altere 0.6 para ajustar
  // Detectar IR
}

// Ajustar distância de deduplicação
const threshold = 0.5;  // Altere para aumentar/diminuir
```

### Adicionar Novos Métodos de Detecção

```typescript
async detectCustomMethod(): Promise<DetectionResult[]> {
  const detections: DetectionResult[] = [];
  
  // Sua lógica aqui
  
  return detections;
}
```

## 🔐 Considerações de Segurança e Privacidade

⚠️ **Importante**: Este aplicativo deve ser usado apenas em:
- ✅ Ambientes que você possui ou tem permissão
- ✅ Para proteger sua própria privacidade
- ✅ Fins educacionais e de pesquisa

❌ **Não use para**:
- Interferir com câmeras de terceiros
- Fins criminosos
- Violar privacidade de outras pessoas

## 📋 Permissões Necessárias

### Android
- `CAMERA`: Acesso à câmera do dispositivo
- `ACCESS_NETWORK_STATE`: Verificar estado da rede
- `ACCESS_WIFI_STATE`: Informações de WiFi
- `ACCESS_FINE_LOCATION`: Localização precisa
- `ACCESS_COARSE_LOCATION`: Localização aproximada

### iOS
- Camera: Acesso à câmera
- Local Network: Acesso à rede local
- Bonjour Services: Descoberta de serviços

## 🐛 Troubleshooting

### Aplicativo não inicia
```bash
# Limpe cache e reinstale
rm -rf node_modules
npm install
npm start
```

### Câmeras não são detectadas
- Certifique-se de que há câmeras reais no ambiente
- Verifique as permissões do aplicativo
- Tente escanear novamente

### Visualizações não aparecem
- Atualize o Expo: `npm install -g expo-cli@latest`
- Limpe o cache: `npm start -- --clear`

## 📊 Dados de Exemplo

Quando você executa uma varredura, o aplicativo retorna dados como:

```json
{
  "type": "IR",
  "confidence": 0.85,
  "location": {
    "x": 2.3,
    "y": 1.5,
    "z": 0.8,
    "distance": 2.8,
    "angle": 45
  },
  "timestamp": 1234567890,
  "details": "LED IR detectado em 2.8m"
}
```

## 🎓 Educação e Pesquisa

Este projeto é excelente para:
- 📚 Aprender sobre detecção de câmeras
- 🔬 Pesquisa em segurança
- 👨‍💻 Desenvolvimento React Native
- 📊 Visualização de dados em tempo real
- 🎮 Criação de aplicativos de detecção

## 📄 Licença

MIT License - Use livremente em seus projetos

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se livre para:
- Reportar bugs
- Sugerir melhorias
- Adicionar novos métodos de detecção
- Melhorar visualizações

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o README
2. Consulte a documentação do Expo
3. Abra uma issue no GitHub

## 🚀 Roadmap Futuro

- [ ] Integração com APIs de câmeras reais
- [ ] Gravação de vídeo de detecções
- [ ] Histórico persistente
- [ ] Exportação de relatórios
- [ ] Modo noturno melhorado
- [ ] Suporte a múltiplos idiomas
- [ ] Integração com serviços de segurança

---

**Desenvolvido com ❤️ para segurança e privacidade**

⚠️ Use responsavelmente e respeite a privacidade de todos!
