import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useSyncContext } from '../context/SyncContext';
import { useEventContext } from '../context/EventContext';
import syncService from '../services/SyncService';

const STATE_LABELS = {
  in_stock: 'En stock',
  in_transit: 'En transit',
  delivered: 'Livré',
  in_maintenance: 'Maintenance',
  anomaly: 'Anomalie',
};

/**
 * SyncCenterScreen — "Centre de synchronisation" exigé par le cahier des charges :
 * forcer la synchro, visualiser la file d'attente, être notifié des conflits
 * (verrouillage optimiste) et DÉCIDER explicitement de rejouer ou d'abandonner
 * (rollback visuel exact) une action en conflit — rien n'est résolu automatiquement.
 */
export default function SyncCenterScreen() {
  const { eventId } = useEventContext();
  const { isOnline, pendingCount, syncing, forceSync } = useSyncContext();
  const [conflicts, setConflicts] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  const loadConflicts = useCallback(async () => {
    setConflicts(await syncService.getConflicts(eventId));
  }, [eventId]);

  useEffect(() => { loadConflicts(); }, [loadConflicts, pendingCount]);

  const onForceSync = async () => {
    await forceSync();
    await loadConflicts();
  };

  const onDiscard = async (clientActionId) => {
    setResolvingId(clientActionId);
    try {
      await syncService.discardConflict(clientActionId);
      await loadConflicts();
    } finally {
      setResolvingId(null);
    }
  };

  const onRetry = async (clientActionId) => {
    setResolvingId(clientActionId);
    try {
      await syncService.retryConflict(clientActionId);
      await onForceSync();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Centre de synchronisation</Text>
      <Text style={styles.status}>
        {isOnline ? 'Connecté au réseau' : 'Hors-ligne'} · {pendingCount} action(s) en attente
      </Text>

      <PrimaryButton label="Forcer la synchronisation" onPress={onForceSync} loading={syncing} disabled={!isOnline} />

      <Text style={styles.sectionTitle}>Conflits détectés</Text>
      <FlatList
        data={conflicts}
        keyExtractor={(c) => c.clientActionId}
        renderItem={({ item }) => (
          <View style={styles.conflictCard}>
            <Text style={styles.conflictItem}>Item {item.itemId}</Text>
            <Text style={styles.conflictTransition}>
              {STATE_LABELS[item.fromState] || item.fromState} → {STATE_LABELS[item.toState] || item.toState}
            </Text>
            <Text style={styles.conflictReason}>{item.conflictReason}</Text>
            <View style={styles.actionsRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <PrimaryButton
                  label="Rejouer"
                  onPress={() => onRetry(item.clientActionId)}
                  loading={resolvingId === item.clientActionId}
                  disabled={!isOnline}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Abandonner"
                  variant="danger"
                  onPress={() => onDiscard(item.clientActionId)}
                  loading={resolvingId === item.clientActionId}
                />
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun conflit — tout est cohérent.</Text>}
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, fontSize: 22, marginBottom: spacing.xs },
  status: { ...typography.caption, marginBottom: spacing.lg },
  sectionTitle: { ...typography.h2, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.sm },
  conflictCard: { backgroundColor: colors.surface, borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  conflictItem: { ...typography.body, fontWeight: '600' },
  conflictTransition: { ...typography.caption, marginTop: spacing.xs },
  conflictReason: { ...typography.caption, marginTop: spacing.xs, color: colors.danger },
  actionsRow: { flexDirection: 'row', marginTop: spacing.md },
  empty: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
});
