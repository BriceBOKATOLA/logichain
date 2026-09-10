import { useEffect, useState, useCallback } from 'react';
import apiClient from '../services/ApiClient';

/**
 * useMapData — Récupère les zones GeoJSON de l'événement (via /events/:id) et les
 * items géolocalisés (via /events/:id/items) pour alimenter MapScreen. Auparavant,
 * MapScreen attendait ces données en paramètres de navigation que personne ne
 * fournissait jamais : ce hook lui donne une source de données autonome et réelle.
 */
export function useMapData(eventId) {
  const [zones, setZones] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [eventRes, itemsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/items`),
      ]);
      setZones(eventRes.data.data.zones || []);
      // Seuls les items déjà géolocalisés (au moins un scan effectué) sont affichables.
      setItems((itemsRes.data.data || []).filter((item) => item.location?.coordinates));
    } catch {
      setError('Carte indisponible hors-ligne pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  return { zones, items, loading, error, refresh: load };
}
