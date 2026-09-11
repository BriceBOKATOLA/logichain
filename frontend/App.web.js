import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import EventGate from './src/navigation/EventGate';
import { colors } from './src/theme/theme';

/**
 * App (web) — Pas d'EventProvider ni de logique offline-first : le tableau de
 * bord de supervision liste tous les événements, il n'a besoin ni de
 * résoudre un « événement actif » unique, ni du cache SQLite local (réservé
 * au mobile terrain). Cela évite aussi de charger inutilement le moteur
 * SQLite web (wa-sqlite, ~600 Ko de WebAssembly) pour un usage qui ne s'en
 * sert jamais — Metro exclut alors toute la chaîne SQLite du bundle web.
 *
 * Metro sélectionne ce fichier automatiquement pour les builds web ; le
 * mobile continue d'utiliser App.js (EventProvider + SyncProvider) sans
 * aucun changement.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AuthProvider>
        <EventGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
