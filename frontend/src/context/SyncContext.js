import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import NetInfo from '../utils/NetInfoCompat';
import syncService from '../services/SyncService';

const SyncContext = createContext(null);

/**
 * SyncProvider — Expose l'état global de synchronisation (nb d'actions en attente,
 * statut réseau) et déclenche automatiquement `flush()` au retour de connectivité.
 */
export function SyncProvider({ eventId, children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const wasOffline = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    if (!eventId) return;
    const count = await syncService.getPendingCount(eventId);
    setPendingCount(count);
  }, [eventId]);

  const forceSync = useCallback(async () => {
    if (!eventId || syncing) return;
    setSyncing(true);
    try {
      await syncService.flush(eventId);
    } finally {
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [eventId, syncing, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online && wasOffline.current) {
        forceSync(); // synchronisation en arrière-plan au retour réseau
      }
      wasOffline.current = !online;
    });
    return unsubscribe;
  }, [forceSync, refreshPendingCount]);

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, syncing, forceSync, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext doit être utilisé dans un <SyncProvider>.');
  return ctx;
}
