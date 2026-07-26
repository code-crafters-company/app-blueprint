import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import CameraDetectionService, {
  CameraDevice,
  ScanProgress,
} from '../services/CameraDetectionService';

export const HomeScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subnet, setSubnet] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const startScan = async () => {
    setIsScanning(true);
    setError(null);
    setDevices([]);
    setProgress(null);
    CameraDetectionService.clear();

    try {
      const net = await CameraDetectionService.getSubnet();
      setSubnet(net ? `${net.subnet}.0/24` : null);

      const found = await CameraDetectionService.scanNetwork((p) => {
        setProgress({ ...p });
        setDevices(CameraDetectionService.getDevices());
      });
      setDevices(found);
      setHasScanned(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao escanear a rede.');
    } finally {
      setIsScanning(false);
    }
  };

  const confidenceLabel = (c: number): string => {
    if (c >= 0.8) return 'Muito Alta';
    if (c >= 0.6) return 'Alta';
    if (c >= 0.4) return 'Média';
    return 'Baixa';
  };

  const confidenceColor = (c: number): string => {
    if (c >= 0.6) return '#00ff00';
    if (c >= 0.4) return '#e9c46a';
    return '#ff6600';
  };

  const stats = CameraDetectionService.getStats();
  const pct = progress ? Math.round((progress.scanned / progress.total) * 100) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Guardian Blueprint</Text>
        <Text style={styles.subtitle}>Detector de câmeras IP · varredura real da rede</Text>
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={[styles.statusValue, isScanning && styles.scanning]}>
            {isScanning ? '🔴 Escaneando' : '🟢 Pronto'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Câmeras</Text>
          <Text style={styles.statusValue}>{devices.length}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Rede</Text>
          <Text style={styles.statusValueSmall}>{subnet || '—'}</Text>
        </View>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonActive]}
        onPress={startScan}
        disabled={isScanning}
      >
        {isScanning ? (
          <View style={styles.row}>
            <ActivityIndicator color="#000" />
            <Text style={styles.scanButtonText}>  Escaneando… {pct}%</Text>
          </View>
        ) : (
          <Text style={styles.scanButtonText}>
            {hasScanned ? '🔄 Escanear Novamente' : '▶️ Iniciar Varredura'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Progress */}
      {isScanning && progress && (
        <View style={styles.progressCard}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Fase {progress.phase}/2 · {progress.phaseLabel} · {progress.scanned}/
            {progress.total} · {progress.currentIp} ·{' '}
            {progress.phase === 1
              ? `${progress.found} vivo(s)`
              : `${progress.found} câmera(s)`}
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Stats */}
      {devices.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Resumo</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total de câmeras:</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Alta confiança:</Text>
            <Text style={styles.statValue}>{stats.highConfidence}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Com stream RTSP:</Text>
            <Text style={styles.statValue}>{stats.rtspDevices}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Fabricante identificado:</Text>
            <Text style={styles.statValue}>{stats.withVendor}</Text>
          </View>
        </View>
      )}

      {/* Device list */}
      {devices.length > 0 && (
        <View style={styles.detectionsContainer}>
          <Text style={styles.detectionsTitle}>🎯 Câmeras Detectadas</Text>
          {devices.map((d) => (
            <View key={d.ip} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceIp}>{d.ip}</Text>
                <View
                  style={[
                    styles.confBadge,
                    { backgroundColor: confidenceColor(d.confidence) },
                  ]}
                >
                  <Text style={styles.confBadgeText}>
                    {(d.confidence * 100).toFixed(0)}% · {confidenceLabel(d.confidence)}
                  </Text>
                </View>
              </View>

              {d.vendor && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fabricante:</Text>
                  <Text style={styles.detailValue}>{d.vendor}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Portas abertas:</Text>
                <Text style={styles.detailValue}>
                  {d.openPorts.map((p) => `${p.port} (${p.service})`).join(', ')}
                </Text>
              </View>

              {d.banner && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Banner:</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {d.banner}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resposta:</Text>
                <Text style={styles.detailValue}>{d.rttMs} ms</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isScanning && hasScanned && devices.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>✅</Text>
          <Text style={styles.emptyStateTitle}>Nenhuma câmera IP encontrada</Text>
          <Text style={styles.emptyStateSubtitle}>
            Nenhum dispositivo com portas de câmera abertas foi encontrado nesta rede.
          </Text>
        </View>
      )}

      {!isScanning && !hasScanned && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📡</Text>
          <Text style={styles.emptyStateTitle}>Pronto para escanear</Text>
          <Text style={styles.emptyStateSubtitle}>
            Toque em "Iniciar Varredura" para procurar câmeras IP na sua rede Wi-Fi.
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚠️ Detecta câmeras IP na MESMA rede Wi-Fi (RTSP/HTTP/ONVIF). Não mede
          distância física nem detecta câmeras fora da rede. Use apenas em redes
          onde você tem autorização.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#00ff00', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#888' },
  row: { flexDirection: 'row', alignItems: 'center' },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00ff0055',
  },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  statusValue: { fontSize: 16, fontWeight: 'bold', color: '#00ff00' },
  statusValueSmall: { fontSize: 12, fontWeight: 'bold', color: '#00ff00' },
  scanning: { color: '#ff0000' },
  scanButton: {
    backgroundColor: '#00ff00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00ff00',
  },
  scanButtonActive: { backgroundColor: '#ff6600', borderColor: '#ff6600' },
  scanButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  progressCard: { marginBottom: 20 },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: 8, backgroundColor: '#00ff00' },
  progressText: { fontSize: 11, color: '#888', marginTop: 6 },
  errorCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  errorText: { fontSize: 13, color: '#ff6666' },
  statsContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00ff0055',
  },
  statsTitle: { fontSize: 16, fontWeight: 'bold', color: '#00ff00', marginBottom: 12 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statLabel: { fontSize: 14, color: '#888' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#00ff00' },
  detectionsContainer: { marginBottom: 30 },
  detectionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 12,
  },
  deviceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deviceIp: { fontSize: 16, fontWeight: 'bold', color: '#00ffff' },
  confBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  confBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#000' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 10 },
  detailLabel: { fontSize: 12, color: '#888', flexShrink: 0 },
  detailValue: { fontSize: 12, color: '#fff', fontWeight: '600', flex: 1, textAlign: 'right' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyStateIcon: { fontSize: 56, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptyStateSubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  footer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff660088',
  },
  footerText: { fontSize: 12, color: '#ff6600', lineHeight: 18 },
});
