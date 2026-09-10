import { useEffect, useState } from 'react';
import NetInfo from '../utils/NetInfoCompat';

/**
 * useNetworkStatus — Petit hook réutilisable pour afficher un badge "hors-ligne"
 * dans n'importe quel écran sans dépendre du SyncContext.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => setIsOnline(!!state.isConnected));
  }, []);

  return isOnline;
}
