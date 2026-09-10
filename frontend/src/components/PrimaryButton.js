import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * PrimaryButton — Bouton d'action principal, contraste élevé pensé pour une
 * utilisation en extérieur / plein soleil (grand terrain de touch, feedback visuel net).
 */
export default function PrimaryButton({ label, onPress, loading, variant = 'primary', disabled }) {
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: isDanger ? colors.danger : colors.primary },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
  label: { ...typography.h2, fontSize: 16, color: '#0F1712' },
});
