import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useEventContext } from '../context/EventContext';
import { useRoutes } from '../hooks/useRoutes';

const STATUS_LABELS = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  validated: 'Validée',
};

/**
 * RouteScreen — « Itinéraires » : la feuille de route assignée au
 * transporteur/agent connecté, exigence explicite du cahier des charges
 * (« visualisation des itinéraires »). Vue PURE : toute la logique réseau vit
 * dans useRoutes().
 */
export default function RouteScreen() {
  const { eventId } = useEventContext();
  const { routes, loading, error, validateStop } = useRoutes(eventId);
  const [validatingStopId, setValidatingStopId] = useState(null);

  const onValidateStop = async (routeId, stopId) => {
    setValidatingStopId(stopId);
    try {
      await validateStop(routeId, stopId);
    } finally {
      setValidatingStopId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.text}>Chargement des feuilles de route…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={routes}
      keyExtractor={(r) => r._id}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.text}>Aucune feuille de route assignée pour cet événement.</Text>
        </View>
      }
      renderItem={({ item: route }) => (
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>Feuille de route</Text>
            <Text style={styles.routeStatus}>{STATUS_LABELS[route.status] || route.status}</Text>
          </View>

          {route.stops.map((stop, index) => (
            <View key={stop._id} style={styles.stopRow}>
              <View style={styles.stopIndex}>
                <Text style={styles.stopIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopMeta}>
                  {stop.itemIds.length} article(s) ·{' '}
                  {stop.plannedAt ? new Date(stop.plannedAt).toLocaleString('fr-FR') : 'Sans horaire prévu'}
                </Text>
                {stop.validatedAt ? (
                  <Text style={styles.stopValidated}>
                    Validé le {new Date(stop.validatedAt).toLocaleString('fr-FR')}
                  </Text>
                ) : (
                  <View style={{ marginTop: spacing.xs }}>
                    <PrimaryButton
                      label="Valider cet arrêt"
                      onPress={() => onValidateStop(route._id, stop._id)}
                      loading={validatingStopId === stop._id}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  text: { ...typography.body, textAlign: 'center' },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeTitle: { ...typography.h2, fontSize: 16 },
  routeStatus: { ...typography.caption, color: colors.primary, textTransform: 'uppercase' },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stopIndex: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stopIndexText: { ...typography.caption, fontWeight: '700' },
  stopMeta: { ...typography.caption },
  stopValidated: { ...typography.caption, color: colors.primary, marginTop: spacing.xs },
});
