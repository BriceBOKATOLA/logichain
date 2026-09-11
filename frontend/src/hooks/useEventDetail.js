import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';

/**
 * useEventDetail — Détail d'un événement pour la vue de supervision web :
 * l'événement lui-même (zones incluses), la liste de son matériel (pour la
 * carte et le tableau détaillé) et sa répartition de stock. Distinct de
 * useEventsOverview, qui ne charge qu'un résumé pour la grille d'accueil.
 */
export function useEventDetail(eventId) {
  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, itemsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/items`, { params: { limit: 200 } }),
      ]);
      setEvent(eventRes.data.data);
      setItems(itemsRes.data.data || []);

      try {
        const stockRes = await apiClient.get(`/events/${eventId}/monitoring/stock`);
        setStock(stockRes.data.data);
      } catch {
        // Rôle sans droit de supervision : le détail reste consultable sans le KPI.
        setStock(null);
      }
    } catch {
      setError("Impossible de charger le détail de l'événement.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  return { event, items, stock, loading, error, refresh: load };
}
