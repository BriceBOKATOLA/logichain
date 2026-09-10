import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useSyncContext } from '../context/SyncContext';

/**
 * SyncStatusBadge — Indicateur permanent (visible sur tous les écrans terrain) de :
 * connectivité + nombre d'actions en attente de synchronisation.
 */
export default function SyncStatusBadge() {
  const { isOnline, pendingCount, syncing } = useSyncContext();

  const label = syncing
    ? 'Synchronisation…'
    : isOnline
      ? pendingCount > 0
        ? `${pendingCount} action(s) à synchroniser`
        : 'À jour'
      : `Hors-ligne · ${pendingCount} en file`;

  const dotColor = syncing
    ? colors.accent
    : isOnline
      ? pendingCount > 0
        ? colors.warning
        : colors.primary
      : colors.offline;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  text: { ...typography.caption, color: colors.textPrimary },
});
