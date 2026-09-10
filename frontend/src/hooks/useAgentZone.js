import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '../services/ApiClient';
import locationService from '../services/LocationService';
import backgroundLocationService from '../services/BackgroundLocationService';

/**
 * useAgentZone — Détermine et met en cache le secteur (zone GeoJSON) dans
 * lequel se trouve l'agent connecté, exigence explicite du cahier des charges
 * (« téléchargement initial du référentiel de données [et] mise en cache du
 * secteur assigné »).
 *
 * Deux sources de mise à jour :
 *  1. une lecture de position immédiate au montage (premier affichage rapide,
 *     sans attendre le premier point du suivi en arrière-plan) ;
 *  2. le suivi en arrière-plan (BackgroundLocationService), qui ne remonte un
 *     point que toutes les 60 s / 50 m — c'est lui qui garde la zone à jour si
 *     l'agent se déplace pendant qu'il utilise l'application.
 *
 * La zone reste en mémoire tant que l'écran qui utilise ce hook est monté :
 * elle n'a pas besoin d'un cache SQLite dédié, contrairement au référentiel
 * d'items (elle se recalcule en un aller-retour réseau léger dès que
 * nécessaire, et n'a pas de sens hors-ligne comme donnée figée).
 */
export function useAgentZone(eventId) {
  const [zone, setZone] = useState(null);
  const [error, setError] = useState(null);
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const resolveZone = useCallback(async ({ lat, lng }) => {
    const currentEventId = eventIdRef.current;
    if (!currentEventId) return;
    try {
      const { data } = await apiClient.get(`/events/${currentEventId}/agent-zone`, {
        params: { lat, lng },
      });
      setZone(data.data || null);
      setError(null);
    } catch {
      // Un agent peut se trouver hors de toute zone déclarée (ex: en transit
      // vers le site) : ce n'est pas une erreur bloquante, juste une absence
      // de secteur assigné pour l'instant.
      setZone(null);
    }
  }, []);

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const position = await locationService.getCurrentPosition();
        if (!cancelled) await resolveZone(position);
      } catch {
        if (!cancelled) setError("Position indisponible : secteur assigné non déterminé pour l'instant.");
      }
    })();

    backgroundLocationService.start(resolveZone);

    return () => {
      cancelled = true;
      backgroundLocationService.stop();
    };
  }, [eventId, resolveZone]);

  return { zone, error };
}
