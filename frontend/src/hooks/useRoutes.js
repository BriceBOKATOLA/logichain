import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';
import { useAuthContext } from '../context/AuthContext';

/**
 * useRoutes — Feuilles de route assignées au transporteur/agent connecté pour
 * l'événement courant, avec validation d'arrêt.
 *
 * Lecture réseau uniquement, sans cache local dédié — contrairement aux items
 * (useTasks) : consulter sa feuille de route suppose déjà une connexion, et sa
 * validation d'arrêt passe par une transaction ACID côté serveur qui n'a pas
 * de sens hors-ligne (contrairement à un scan, qui lui reste une transition
 * d'état simple, rejouable après coup).
 */
export function useRoutes(eventId) {
  const { user } = useAuthContext();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!eventId || !user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/routes/transporter/${user._id}`, { params: { eventId } });
      setRoutes(data.data || []);
    } catch {
      setError('Feuilles de route indisponibles hors-ligne pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [eventId, user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const validateStop = useCallback(async (routeId, stopId) => {
    const { data } = await apiClient.patch(`/routes/${routeId}/stops/${stopId}/validate`);
    setRoutes((prev) => prev.map((r) => (r._id === routeId ? data.data : r)));
  }, []);

  return { routes, loading, error, refresh: load, validateStop };
}
