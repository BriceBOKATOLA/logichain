import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * AlertBanner — Bannière d'alerte critique reçue en push (WebSocket/SSE).
 */
export default function AlertBanner({ message, visible }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠ {message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger + '22',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  text: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
