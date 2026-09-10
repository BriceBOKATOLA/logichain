import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/ApiClient';
import socketService from '../services/SocketService';

/**
 * useDashboard — Encapsule TOUTE la logique métier du tableau de bord :
 * récupération des KPI de stock et abonnement aux alertes critiques temps réel.
 * DashboardScreen ne fait plus qu'afficher ce que ce hook lui fournit — aucun
 * appel réseau ni gestion de cycle de vie WebSocket ne doit vivre dans la Vue
 * (cf. exigence "Architecture logicielle rigoureuse" du cahier des charges).
 */
export function useDashboard(eventId) {
  const [kpi, setKpi] = useState(null);
  const [alert, setAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadKpi = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data } = await apiClient.get(`/events/${eventId}/monitoring/stock`);
      setKpi(data.data);
    } catch {
      // Hors-ligne : on garde silencieusement les derniers indicateurs affichés.
    }
  }, [eventId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadKpi();
    setRefreshing(false);
  }, [loadKpi]);

  useEffect(() => {
    if (!eventId) return undefined;
    loadKpi();

    socketService.connect(eventId, (payload) => {
      setAlert(payload.label ? `Anomalie sur ${payload.label}` : 'Alerte critique reçue');
    });

    return () => socketService.disconnect();
  }, [eventId, loadKpi]);

  return { kpi, alert, refreshing, refresh };
}
