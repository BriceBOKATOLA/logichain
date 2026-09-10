import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useEventContext } from '../context/EventContext';
import { useScanner } from '../hooks/useScanner';

/**
 * AnomalyDeclarationScreen — Vue PURE : capture uniquement la description de
 * l'anomalie et délègue toute la logique (résolution item, GPS, sync) à
 * useScanner(), le même hook utilisé par ScanScreen (aucune duplication de
 * logique métier entre les deux écrans).
 */
export default function AnomalyDeclarationScreen({ route, navigation }) {
  const { eventId } = useEventContext();
  const { handleScan, error } = useScanner(eventId);
  const { qrCode } = route.params || {};
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const item = await handleScan(qrCode, 'anomaly', note);
      if (item) navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Déclarer une anomalie</Text>
      <Text style={styles.subtitle}>Équipement : {qrCode}</Text>
      <TextInput
        style={styles.input}
        placeholder="Décrivez l'anomalie constatée…"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        value={note}
        onChangeText={setNote}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label="Valider la déclaration" variant="danger" onPress={submit} loading={loading} />
      <Text style={styles.info}>
        La déclaration est enregistrée localement et sera synchronisée automatiquement, même hors-ligne.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, fontSize: 22 },
  subtitle: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    minHeight: 100,
  },
  error: { color: colors.danger, ...typography.caption, marginBottom: spacing.md },
  info: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
});
