import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';

/**
 * useEventsOverview — Vue de supervision WEB : liste TOUS les événements
 * (contrairement au mobile terrain, scopé au seul « événement actif » via
 * GET /events/active) et agrège pour chacun sa répartition de stock.
 *
 * C'est cette vision d'ensemble multi-événements qui justifie un tableau de
 * bord distinct de celui du mobile — voir DashboardScreen.web.js.
 */
export function useEventsOverview() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/events', { params: { limit: 100, sort: '-startDate' } });

      const withStats = await Promise.all(
        (data.data || []).map(async (event) => {
          try {
            const { data: stockRes } = await apiClient.get(`/events/${event._id}/monitoring/stock`);
            return { ...event, stock: stockRes.data };
          } catch {
            // Rôle sans droit de supervision (field_agent/transporter) ou
            // aucun matériel encore rattaché : l'événement reste visible,
            // simplement sans indicateurs.
            return { ...event, stock: null };
          }
        }),
      );

      setEvents(withStats);
    } catch {
      setError('Impossible de charger les événements pour le moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}
