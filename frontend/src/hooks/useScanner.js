import { useCallback, useState } from 'react';
import scannerService from '../services/ScannerService';
import syncService from '../services/SyncService';
import localItemRepository from '../database/repositories/LocalItemRepository';
import locationService from '../services/LocationService';

/**
 * useScanner — Encapsule le flux "scan -> résolution item -> transition optimiste".
 * Le composant ScanScreen ne fait que dessiner l'UI et déléguer les événements ici,
 * conformément à la séparation Views/Services imposée par le cahier des charges.
 */
export function useScanner(eventId) {
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = useCallback(
    async (rawValue, toState, note) => {
      setError(null);
      const qrCode = scannerService.onCodeScanned(rawValue);

      const item = await localItemRepository.findByQrCode(qrCode);
      if (!item) {
        scannerService.vibrateError();
        setError("Cet équipement n'est pas connu localement. Synchronisez d'abord le référentiel.");
        return null;
      }

      let coords = null;
      try {
        coords = await locationService.getCurrentPosition();
      } catch {
        /* GPS indisponible, on continue */
      }

      const location = coords ? { type: 'Point', coordinates: [coords.lng, coords.lat] } : undefined;

      await syncService.recordTransition({
        eventId,
        itemId: item._id,
        expectedVersion: item.version,
        toState,
        location,
        note,
      });

      setLastResult({ item, toState });
      return item;
    },
    [eventId],
  );

  return { handleScan, lastResult, error };
}
