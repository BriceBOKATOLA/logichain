import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';
import SyncStatusBadge from '../components/SyncStatusBadge';
import AlertBanner from '../components/AlertBanner';
import { useEventContext } from '../context/EventContext';
import { useDashboard } from '../hooks/useDashboard';

/**
 * DashboardScreen — Vue PURE : uniquement rendu et capture d'événements utilisateur
 * (pull-to-refresh, navigation). Toute la logique (réseau, WebSocket) vit dans useDashboard().
 */
export default function DashboardScreen({ navigation }) {
  const { eventId } = useEventContext();
  const { kpi, alert, refreshing, refresh } = useDashboard(eventId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tableau de bord</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('Map')} style={styles.mapButton}>
            <Icon name="map-pin" size={16} color={colors.accent} />
          </Pressable>
          <SyncStatusBadge />
        </View>
      </View>

      <AlertBanner message={alert} visible={!!alert} />

      <View style={styles.kpiGrid}>
        {(kpi || []).map((k) => (
          <View key={k.state} style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{k.count}</Text>
            <Text style={styles.kpiLabel}>{k.state}</Text>
          </View>
        ))}
        {!kpi && <Text style={styles.placeholder}>Chargement des indicateurs…</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mapButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h1, fontSize: 24 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  kpiValue: { ...typography.h1, color: colors.primary },
  kpiLabel: { ...typography.caption, marginTop: spacing.xs, textTransform: 'uppercase' },
  placeholder: { ...typography.caption },
});
