import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * PrimaryButton — Bouton d'action principal, contraste élevé pensé pour une
 * utilisation en extérieur / plein soleil (grand terrain de touch, feedback visuel net).
 */
// Le variant `secondary` sert aux actions de retrait (annuler, fermer) : il ne
// doit jamais attirer l'œil autant qu'une action de transition d'état, qui est
// l'acte métier réel de l'agent.
const VARIANT_BACKGROUND = {
  primary: colors.primary,
  danger: colors.danger,
  secondary: 'transparent',
};

export default function PrimaryButton({ label, onPress, loading, variant = 'primary', disabled }) {
  const isSecondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: VARIANT_BACKGROUND[variant] ?? colors.primary },
        isSecondary && styles.secondary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : colors.background} />
      ) : (
        <Text style={[styles.label, isSecondary && styles.secondaryLabel]}>{label}</Text>
      )}
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
  secondary: { borderWidth: 1.5, borderColor: colors.primary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
  label: { ...typography.h2, fontSize: 16, color: '#0F1712' },
  secondaryLabel: { color: colors.primary },
});
