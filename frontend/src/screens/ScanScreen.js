import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useScanner } from '../hooks/useScanner';
import { useEventContext } from '../context/EventContext';

const NEXT_STATE_LABEL = {
  in_transit: 'Marquer "En transit"',
  delivered: 'Marquer "Livré"',
  in_maintenance: 'Marquer "En maintenance"',
};

// Types de codes reconnus, alignés sur l'étiquetage du matériel : QR pour les
// fiches générées par le backend, Code 128 et EAN-13 pour le matériel loué
// arrivant déjà étiqueté par le prestataire.
const BARCODE_TYPES = ['qr', 'code128', 'ean13'];

/**
 * ScanScreen — Vue : capture caméra + affichage. Toute la logique de résolution
 * d'item et de synchronisation vit dans useScanner()/SyncService (aucun appel réseau ici).
 * Peut aussi être ouvert directement sur un item précis via route.params.presetQr
 * (tap sur une tâche depuis TaskListScreen), sans passer par la caméra.
 *
 * S'appuie sur `expo-camera`, la bibliothèque effectivement déclarée dans les
 * dépendances. La version précédente importait `react-native-vision-camera`,
 * absent du package.json : l'écran de scan — cœur du métier — plantait au
 * chargement et empêchait même la compilation du bundle.
 */
export default function ScanScreen({ navigation, route }) {
  const { eventId } = useEventContext();
  const [permission, requestPermission] = useCameraPermissions();
  const { handleScan, lastResult, error } = useScanner(eventId);
  const [busy, setBusy] = useState(false);
  const [pendingCode, setPendingCode] = useState(route.params?.presetQr ?? null);
  // Sur le web, une permission déjà refusée par le passé fait échouer
  // `getUserMedia` SANS ré-afficher de fenêtre d'autorisation : rien ne se
  // passe visuellement après le clic, ce qui se lit comme « le bouton ne
  // marche pas ». On distingue donc explicitement ce cas pour donner une
  // instruction actionnable, plutôt que de laisser l'écran inchangé.
  const [permissionRefusedAfterPrompt, setPermissionRefusedAfterPrompt] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    setPermissionRefusedAfterPrompt(!result.granted);
  }, [requestPermission]);

  useEffect(() => {
    if (route.params?.presetQr) setPendingCode(route.params.presetQr);
  }, [route.params?.presetQr]);

  const onBarcodeScanned = useCallback(
    ({ data }) => {
      if (data && !busy) setPendingCode(data);
    },
    [busy],
  );

  const confirmTransition = useCallback(
    async (toState) => {
      if (!pendingCode) return;
      setBusy(true);
      await handleScan(pendingCode, toState);
      setBusy(false);
      setPendingCode(null);
    },
    [pendingCode, handleScan],
  );

  // La caméra reste active tant qu'aucun code n'attend de décision : sinon elle
  // continuerait à lire en boucle et écraserait le code affiché à l'agent.
  const cameraActive = permission?.granted && !pendingCode && !busy;

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={cameraActive ? onBarcodeScanned : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCamera]}>
          <Text style={styles.info}>
            {permission
              ? "L'accès à la caméra est nécessaire pour scanner le matériel."
              : 'Initialisation de la caméra…'}
          </Text>
          {permission && !permission.granted && (
            <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
              <PrimaryButton label="Autoriser la caméra" onPress={handleRequestPermission} />
              {permissionRefusedAfterPrompt && (
                <Text style={[styles.info, styles.permissionHint]}>
                  Toujours refusé. Si aucune fenêtre d&apos;autorisation n&apos;est apparue, la caméra a
                  probablement déjà été bloquée pour ce site : ouvrez ses réglages (icône de cadenas dans la
                  barre d&apos;adresse) pour l&apos;autoriser manuellement, puis rechargez la page.
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.overlay}>
        {permission?.granted && (
          <>
            <View style={styles.frame} />
            <Text style={styles.hint}>Visez le QR code / code-barres du matériel</Text>
          </>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
              onPress={() => {
                navigation.navigate('Anomaly', { qrCode: pendingCode });
                setPendingCode(null);
              }}
              disabled={busy}
            />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            {/* Sans cette sortie, un code lu par erreur bloquerait la caméra
                jusqu'à ce que l'agent choisisse une transition. */}
            <PrimaryButton
              label="Annuler"
              variant="secondary"
              onPress={() => setPendingCode(null)}
              disabled={busy}
            />
          </View>
        </View>
      )}

      {lastResult && !pendingCode && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✓ {lastResult.item.label} → {lastResult.toState}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  noCamera: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  info: { ...typography.body, textAlign: 'center' },
  permissionHint: { marginTop: spacing.sm, color: colors.danger, maxWidth: 320 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderWidth: 3, borderColor: colors.primary, borderRadius: radius.md },
  hint: {
    ...typography.caption,
    color: '#fff',
    marginTop: spacing.md,
    backgroundColor: '#00000088',
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorBox: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.danger + 'DD',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { color: '#fff', ...typography.body },
  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  codeText: { ...typography.body, marginBottom: spacing.sm },
  successBox: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary + 'DD',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  successText: { color: '#0F1712', fontWeight: '700' },
});
