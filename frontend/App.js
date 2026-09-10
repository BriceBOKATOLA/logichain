import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventContext';
import EventGate from './src/navigation/EventGate';
import { colors } from './src/theme/theme';
import ensureAdmin from './src/utils/ensureAdmin';

/**
 * App — Racine de l'application. Chaîne de branchement :
 * AuthProvider (session) -> EventProvider (résout l'événement actif via le back)
 * -> EventGate (attend la résolution puis monte SyncProvider + AppNavigator).
 */
export default function App() {
  React.useEffect(() => {
    // Ensure admin exists on backend when app starts (best-effort)
    ensureAdmin().then((ok) => {
      if (!ok) console.warn('Admin check failed');
    });
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AuthProvider>
        <EventProvider>
          <EventGate />
        </EventProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
