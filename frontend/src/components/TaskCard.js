import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing, typography, shadow } from '../theme/theme';

const STATE_LABELS = {
  in_stock: 'En stock',
  in_transit: 'En transit',
  delivered: 'Livré',
  in_maintenance: 'Maintenance',
  anomaly: 'Anomalie',
};

const STATE_COLORS = {
  in_stock: colors.textSecondary,
  in_transit: colors.accent,
  delivered: colors.primary,
  in_maintenance: colors.warning,
  anomaly: colors.danger,
};

export default function TaskCard({ item, onPress }) {
  const stateColor = STATE_COLORS[item.state] || colors.textSecondary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
        <View style={[styles.badge, { backgroundColor: stateColor + '22', borderColor: stateColor }]}>
          <Text style={[styles.badgeText, { color: stateColor }]}>
            {STATE_LABELS[item.state] || item.state}
          </Text>
        </View>
      </View>
      <Text style={styles.qr}>{item.qrCode}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.body, fontWeight: '600', flexShrink: 1, marginRight: spacing.sm },
  qr: { ...typography.caption, marginTop: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
