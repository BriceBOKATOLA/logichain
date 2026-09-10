import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';
import localItemRepository from '../database/repositories/LocalItemRepository';
import syncQueueRepository from '../database/repositories/SyncQueueRepository';

/**
 * useTasks — Fournit la liste des items/tâches d'un événement en respectant
 * l'approche offline-first : lecture immédiate du cache local, puis tentative
 * de rafraîchissement réseau qui met à jour le cache silencieusement — sans
 * jamais écraser un item dont une action locale est encore en attente de sync
 * (voir SyncQueueRepository.getUnresolvedItemIds).
 */
export function useTasks(eventId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFromCache = useCallback(async () => {
    if (!eventId) return;
    const cached = await localItemRepository.findByEvent(eventId);
    setTasks(cached);
    setLoading(false);
  }, [eventId]);

  const refreshFromServer = useCallback(async () => {
    if (!eventId) return;
    try {
      const [{ data }, protectedIds] = await Promise.all([
        apiClient.get(`/events/${eventId}/items`),
        syncQueueRepository.getUnresolvedItemIds(eventId),
      ]);
      await localItemRepository.upsertMany(data.data, protectedIds);
      await loadFromCache();
    } catch {
      // Silencieux : on reste sur les données locales si le réseau est indisponible.
    }
  }, [eventId, loadFromCache]);

  useEffect(() => {
    loadFromCache().then(refreshFromServer);
  }, [loadFromCache, refreshFromServer]);

  return { tasks, loading, refresh: refreshFromServer };
}
