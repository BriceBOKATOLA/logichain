import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import { useAuthContext } from '../context/AuthContext';
import { useEventContext } from '../context/EventContext';
import { SyncProvider } from '../context/SyncContext';
import AppNavigator from './AppNavigator';
import PrimaryButton from '../components/PrimaryButton';

/**
 * EventGate — Attend que l'événement actif soit résolu (branchement dynamique
 * front <-> back, voir EventContext) avant de monter la navigation principale
 * et le SyncProvider (qui a besoin d'un eventId pour piloter la file offline).
 * Tant que l'utilisateur n'est pas connecté, on affiche directement l'écran de login.
 */
export default function EventGate() {
  const { user } = useAuthContext();
  const { eventId, loading, error, refresh } = useEventContext();

  if (!user) {
    return <AppNavigator />; // AppNavigator gère lui-même l'affichage du LoginScreen
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.text}>Connexion à l'événement actif…</Text>
      </View>
    );
  }

  if (error && !eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error}</Text>
        <View style={{ marginTop: spacing.lg, width: '80%' }}>
          <PrimaryButton label="Réessayer" onPress={refresh} />
        </View>
      </View>
    );
  }

  return (
    <SyncProvider eventId={eventId}>
      <AppNavigator />
    </SyncProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  text: { ...typography.body, textAlign: 'center', marginTop: spacing.md },
});
