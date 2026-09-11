import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme/theme';
import { useAuthContext } from '../context/AuthContext';
import { useUsers } from '../hooks/useUsers';

const ROLE_LABELS = {
  admin: 'Administrateur',
  logistics_manager: 'Responsable logistique',
  field_agent: 'Agent de terrain',
  transporter: 'Transporteur',
};

/**
 * UsersScreen (web) — Gestion des comptes pour l'administrateur : voir tous
 * les utilisateurs et les activer/désactiver en un clic. N'existe que côté
 * web (écran de supervision bureau) ; la route est elle-même déjà réservée à
 * l'administrateur par AuthContext.web.js (seul un admin peut se connecter),
 * et l'API rejette de toute façon /users à tout autre rôle.
 */
export default function UsersScreen() {
  const navigation = useNavigation();
  const { user: currentUser } = useAuthContext();
  const { users, loading, error, refresh, toggleActive, togglingId } = useUsers();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Retour au tableau de bord</Text>
          </Pressable>
          <Text style={styles.title}>Utilisateurs</Text>
          <Text style={styles.subtitle}>{users.length} compte(s)</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={refresh}>
          <Text style={styles.secondaryButtonText}>Rafraîchir</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.text}>Chargement des utilisateurs…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.text}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <View style={styles.table}>
          {users.map((u) => (
            <View key={u._id} style={styles.row}>
              <View style={styles.identity}>
                <Text style={styles.fullName} numberOfLines={1}>
                  {u.fullName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {u.email}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{ROLE_LABELS[u.role] || u.role}</Text>
              </View>
              <Text style={styles.zone}>{u.assignedZone || 'Aucun secteur'}</Text>
              <View style={styles.toggleBlock}>
                {u._id === currentUser?._id ? (
                  <Text style={styles.statusLabel}>Vous</Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: u.isActive ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </Text>
                    <Switch
                      value={u.isActive}
                      onValueChange={(next) => toggleActive(u._id, next)}
                      disabled={togglingId === u._id}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </>
                )}
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
  backButton: { marginBottom: spacing.xs },
  backButtonText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  identity: { flex: 2, minWidth: 180 },
  fullName: { ...typography.body, fontWeight: '700' },
  email: { ...typography.caption, color: colors.textSecondary },
  roleBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  roleBadgeText: { ...typography.caption, fontSize: 11, fontWeight: '700' },
  zone: { ...typography.caption, minWidth: 100 },
  toggleBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' },
  statusLabel: { ...typography.caption, fontWeight: '700' },
});
