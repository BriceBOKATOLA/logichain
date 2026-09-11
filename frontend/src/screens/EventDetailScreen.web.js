import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';
import { useEventDetail } from '../hooks/useEventDetail';
import ZoneMap from '../components/ZoneMap';

const STATUS_LABELS = { draft: 'Brouillon', active: 'Actif', closed: 'Clôturé' };
const STATUS_COLORS = { draft: colors.warning, active: colors.primary, closed: colors.textSecondary };

const STATE_LABELS = {
  in_stock: 'En stock',
  in_transit: 'En transit',
  delivered: 'Livré',
  in_maintenance: 'Maintenance',
  anomaly: 'Anomalie',
};
const STATE_COLORS = {
  in_stock: colors.textSecondary,
  in_transit: colors.warning,
  delivered: colors.primary,
  in_maintenance: colors.danger,
  anomaly: colors.danger,
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Centre par défaut (Paris) si l'événement n'a aucune zone géolocalisée :
// la carte doit toujours avoir une région de départ valide.
const DEFAULT_REGION = { latitude: 48.8566, longitude: 2.3522 };

/**
 * EventDetailScreen (web) — Détail d'un événement pour l'administrateur :
 * zones affiliées, carte interactive du matériel géolocalisé, et liste
 * complète des items (pas seulement l'agrégat KPI de la grille d'accueil).
 * N'existe que côté web (Metro ne la charge jamais sur mobile) : c'est une
 * vue de supervision bureau, pas un écran de terrain.
 */
export default function EventDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params;
  const { event, items, stock, loading, error, refresh } = useEventDetail(eventId);

  const mapRegion = useMemo(() => {
    const zone = event?.zones?.[0];
    if (!zone) return DEFAULT_REGION;
    const ring = zone.geometry.coordinates[0];
    const lngs = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [event]);

  const locatedItems = useMemo(
    () =>
      items.filter(
        (it) => it.location && (it.location.coordinates[0] !== 0 || it.location.coordinates[1] !== 0),
      ),
    [items],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.text}>Chargement en cours…</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error || 'Événement introuvable.'}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBlock}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Retour au tableau de bord</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.name}</Text>
            <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[event.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[event.status] }]}>
                {STATUS_LABELS[event.status] || event.status}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {formatDate(event.startDate)} → {formatDate(event.endDate)}
          </Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={refresh}>
          <Text style={styles.secondaryButtonText}>Rafraîchir</Text>
        </Pressable>
      </View>

      {stock && (
        <View style={styles.kpiRow}>
          {stock.map((k) => (
            <View key={k.state} style={styles.kpiChip}>
              <Text style={styles.kpiValue}>{k.count}</Text>
              <Text style={styles.kpiLabel}>{STATE_LABELS[k.state] || k.state}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Zones affiliées ({(event.zones || []).length})</Text>
      {(event.zones || []).length === 0 ? (
        <Text style={styles.cardMeta}>Aucune zone définie pour cet événement.</Text>
      ) : (
        <View style={styles.zoneList}>
          {event.zones.map((zone) => (
            <View key={zone._id} style={styles.zoneChip}>
              <Text style={styles.zoneChipText}>{zone.name}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Carte du matériel géolocalisé</Text>
      <View style={styles.mapBox}>
        <ZoneMap zones={event.zones || []} items={locatedItems} initialRegion={mapRegion} />
      </View>
      {items.length > locatedItems.length && (
        <Text style={styles.cardMeta}>
          {items.length - locatedItems.length} élément(s) sans position connue, non affiché(s) sur la carte.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Matériel ({items.length})</Text>
      {items.length === 0 ? (
        <Text style={styles.cardMeta}>Aucun matériel rattaché à cet événement.</Text>
      ) : (
        <View style={styles.itemTable}>
          {items.map((item) => (
            <View key={item._id} style={styles.itemRow}>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.itemQr} numberOfLines={1}>
                {item.qrCode}
              </Text>
              <View style={[styles.stateBadge, { borderColor: STATE_COLORS[item.state] }]}>
                <Text style={[styles.stateBadgeText, { color: STATE_COLORS[item.state] }]}>
                  {STATE_LABELS[item.state] || item.state}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  text: { ...typography.body, textAlign: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerTitleBlock: { gap: spacing.xs },
  backButton: { marginBottom: spacing.xs },
  backButtonText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: { ...typography.h2, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.sm },
  cardMeta: { ...typography.caption },
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
  zoneList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  zoneChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  zoneChipText: { ...typography.caption, fontWeight: '700' },
  mapBox: {
    height: 420,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  itemTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLabel: { ...typography.body, flex: 2, fontWeight: '600' },
  itemQr: { ...typography.caption, flex: 1, color: colors.textSecondary },
  stateBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  stateBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
