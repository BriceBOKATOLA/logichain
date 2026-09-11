import React from 'react';
import AppNavigator from './AppNavigator';

/**
 * EventGate (web) — Le tableau de bord de supervision liste TOUS les
 * événements ; il n'a donc pas besoin de résoudre un « événement actif »
 * unique ni de monter SyncProvider (synchronisation hors-ligne), tous deux
 * réservés au mobile terrain. On rend directement AppNavigator, qui gère
 * lui-même l'écran de connexion tant que l'utilisateur n'est pas authentifié.
 *
 * Metro sélectionne ce fichier automatiquement pour les builds web ; le
 * mobile continue d'utiliser EventGate.js (résolution de l'événement actif +
 * SyncProvider) sans aucun changement.
 */
export default function EventGate() {
  return <AppNavigator />;
}
