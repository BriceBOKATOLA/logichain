import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';

/**
 * useUsers — Gestion administrative des comptes pour le tableau de bord web :
 * liste tous les utilisateurs et permet de les activer/désactiver en un clic
 * (PATCH /users/:id/status), sans jamais les supprimer physiquement (l'API
 * préserve l'historique des items scannés par chaque compte).
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/users', { params: { limit: 200 } });
      setUsers(data.data || []);
    } catch {
      setError('Impossible de charger les utilisateurs pour le moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = useCallback(async (userId, nextIsActive) => {
    setTogglingId(userId);
    // Optimiste : la bascule doit paraître instantanée dans l'UI.
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: nextIsActive } : u)));
    try {
      await apiClient.patch(`/users/${userId}/status`, { isActive: nextIsActive });
    } catch {
      // Échec réseau/serveur : on revient à l'état précédent plutôt que de
      // laisser l'UI mentir sur l'état réel du compte.
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: !nextIsActive } : u)));
    } finally {
      setTogglingId(null);
    }
  }, []);

  return { users, loading, error, refresh: load, toggleActive, togglingId };
}
