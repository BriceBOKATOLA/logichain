import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';
import { useAuthContext } from '../context/AuthContext';
import { useEventsOverview } from '../hooks/useEventsOverview';

const STATUS_LABELS = { draft: 'Brouillon', active: 'Actif', closed: 'Clôturé' };
const STATUS_COLORS = { draft: colors.warning, active: colors.primary, closed: colors.textSecondary };

const STATE_LABELS = {
  in_stock: 'En stock',
  in_transit: 'En transit',
  delivered: 'Livré',
  in_maintenance: 'Maintenance',
  anomaly: 'Anomalie',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * DashboardScreen (web) — Vue de SUPERVISION multi-événements, distincte à
 * dessein du tableau de bord mobile (scopé au seul événement actif) : décision
 * explicite de ne porter sur le web QUE cette vue d'ensemble, le scan, les
 * itinéraires, le centre de synchronisation, la carte et la déclaration
 * d'anomalie restant des fonctionnalités de terrain réservées au mobile
 * (caméra, GPS en arrière-plan, file d'attente hors-ligne n'ont pas leur
 * place dans un usage bureau).
 */
export default function DashboardScreen() {
  const navigation = useNavigation();
  const { logout } = useAuthContext();
  const { events, loading, error, refresh } = useEventsOverview();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>LogiChain Supervision</Text>
          <Text style={styles.subtitle}>{events.length} événement(s)</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Users')}>
            <Text style={styles.secondaryButtonText}>Utilisateurs</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={refresh}>
            <Text style={styles.secondaryButtonText}>Rafraîchir</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <Text style={styles.secondaryButtonText}>Déconnexion</Text>
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.text}>Chargement des événements…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.text}>{error}</Text>
        </View>
      )}

      {!loading && !error && events.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.text}>Aucun événement enregistré pour le moment.</Text>
        </View>
      )}

      <View style={styles.grid}>
        {events.map((event) => (
          <Pressable
            key={event._id}
            style={({ hovered }) => [styles.card, hovered && styles.cardHovered]}
            onPress={() => navigation.navigate('EventDetail', { eventId: event._id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {event.name}
              </Text>
              <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[event.status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[event.status] }]}>
                  {STATUS_LABELS[event.status] || event.status}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDates}>
              {formatDate(event.startDate)} → {formatDate(event.endDate)}
            </Text>
            <Text style={styles.cardMeta}>{(event.zones || []).length} zone(s)</Text>

            {event.stock ? (
              <View style={styles.kpiRow}>
                {event.stock.map((k) => (
                  <View key={k.state} style={styles.kpiChip}>
                    <Text style={styles.kpiValue}>{k.count}</Text>
                    <Text style={styles.kpiLabel}>{STATE_LABELS[k.state] || k.state}</Text>
                  </View>
                ))}
                {event.stock.length === 0 && <Text style={styles.cardMeta}>Aucun matériel rattaché.</Text>}
              </View>
            ) : (
              <Text style={styles.cardMeta}>Statistiques non disponibles pour votre rôle.</Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  text: { ...typography.body, textAlign: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: 320,
    ...shadow.card,
  },
  cardHovered: { borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { ...typography.h2, fontSize: 17, flex: 1, marginRight: spacing.sm },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardDates: { ...typography.caption, marginTop: spacing.sm },
  cardMeta: { ...typography.caption, marginTop: spacing.xs },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  kpiChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    minWidth: 64,
  },
  kpiValue: { ...typography.h2, fontSize: 16, color: colors.primary },
  kpiLabel: { ...typography.caption, fontSize: 10, textTransform: 'uppercase' },
});
