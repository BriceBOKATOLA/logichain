import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../services/ApiClient';
import localEventRepository from '../database/repositories/LocalEventRepository';
import { useAuthContext } from './AuthContext';

const EventContext = createContext(null);

/**
 * EventProvider — C'est ICI que le front se "branche" concrètement sur le back :
 * dès qu'un utilisateur est authentifié, on demande au backend l'événement actif
 * (`GET /events/active`) et on le met en cache local (SQLite) pour un usage
 * offline-first ensuite. Plus aucun identifiant d'événement en dur dans les écrans :
 * tout composant consomme `useEventContext().eventId`.
 */
export function EventProvider({ children }) {
  const { user } = useAuthContext();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolveActiveEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/events/active');
      const activeEvent = data.data;
      await localEventRepository.upsert(activeEvent);
      setEvent(activeEvent);
    } catch (err) {
      // Hors-ligne ou aucun événement actif : on retombe sur le dernier événement mis en cache.
      const cached = await localEventRepository.getLastCached();
      if (cached) {
        setEvent(cached);
      } else {
        setError(
          err.response?.status === 404
            ? "Aucun événement actif côté serveur pour le moment."
            : "Impossible de joindre le serveur et aucun événement n'est disponible en cache.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      resolveActiveEvent();
    } else {
      // Déconnexion (manuelle ou session expirée) : on efface l'événement en mémoire
      // pour ne jamais montrer les données d'un événement à un utilisateur qui
      // vient de se déconnecter, ni les mélanger avec celles du prochain utilisateur connecté.
      setEvent(null);
      setError(null);
      setLoading(true);
    }
  }, [user, resolveActiveEvent]);

  return (
    <EventContext.Provider value={{ event, eventId: event?._id, loading, error, refresh: resolveActiveEvent }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEventContext doit être utilisé dans un <EventProvider>.');
  return ctx;
}
