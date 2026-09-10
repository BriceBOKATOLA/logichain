import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useScanner } from '../hooks/useScanner';
import { useEventContext } from '../context/EventContext';

const NEXT_STATE_LABEL = {
  in_transit: 'Marquer "En transit"',
  delivered: 'Marquer "Livré"',
  in_maintenance: 'Marquer "En maintenance"',
};

/**
 * ScanScreen — Vue : capture caméra + affichage. Toute la logique de résolution
 * d'item et de synchronisation vit dans useScanner()/SyncService (aucun appel réseau ici).
 * Peut aussi être ouvert directement sur un item précis via route.params.presetQr
 * (tap sur une tâche depuis TaskListScreen), sans passer par la caméra.
 */
export default function ScanScreen({ navigation, route }) {
  const { eventId } = useEventContext();
  const device = useCameraDevice('back');
  const { handleScan, lastResult, error } = useScanner(eventId);
  const [busy, setBusy] = useState(false);
  const [pendingCode, setPendingCode] = useState(route.params?.presetQr ?? null);

  useEffect(() => {
    if (route.params?.presetQr) setPendingCode(route.params.presetQr);
  }, [route.params?.presetQr]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'ean-13'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value && !busy) setPendingCode(value);
    },
  });

  const confirmTransition = useCallback(async (toState) => {
    if (!pendingCode) return;
    setBusy(true);
    await handleScan(pendingCode, toState);
    setBusy(false);
    setPendingCode(null);
  }, [pendingCode, handleScan]);

  return (
    <View style={styles.container}>
      {device ? (
        <Camera style={StyleSheet.absoluteFill} device={device} isActive codeScanner={codeScanner} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCamera]}>
          <Text style={styles.info}>Caméra indisponible sur ce terminal.</Text>
        </View>
      )}

      <View style={styles.overlay}>
        {device && (
          <>
            <View style={styles.frame} />
            <Text style={styles.hint}>Visez le QR code / code-barres du matériel</Text>
          </>
        )}
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      {pendingCode && (
        <View style={styles.actionSheet}>
          <Text style={styles.codeText}>Code lu : {pendingCode}</Text>
          {Object.entries(NEXT_STATE_LABEL).map(([state, label]) => (
            <View key={state} style={{ marginTop: spacing.sm }}>
              <PrimaryButton label={label} onPress={() => confirmTransition(state)} loading={busy} />
            </View>
          ))}
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label="Déclarer une anomalie"
              variant="danger"
              onPress={() => { navigation.navigate('Anomaly', { qrCode: pendingCode }); setPendingCode(null); }}
              disabled={busy}
            />
          </View>
        </View>
      )}

      {lastResult && !pendingCode && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ {lastResult.item.label} → {lastResult.toState}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  noCamera: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  info: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderWidth: 3, borderColor: colors.primary, borderRadius: radius.md },
  hint: { ...typography.caption, color: '#fff', marginTop: spacing.md, backgroundColor: '#00000088', padding: spacing.sm, borderRadius: radius.sm },
  errorBox: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, backgroundColor: colors.danger + 'DD', padding: spacing.md, borderRadius: radius.md },
  errorText: { color: '#fff', ...typography.body },
  actionSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  codeText: { ...typography.body, marginBottom: spacing.sm },
  successBox: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, backgroundColor: colors.primary + 'DD', padding: spacing.md, borderRadius: radius.md },
  successText: { color: '#0F1712', fontWeight: '700' },
});
