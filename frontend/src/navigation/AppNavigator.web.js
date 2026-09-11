import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { useAuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://logichain.online', 'https://www.logichain.online'],
  config: {
    screens: {
      Login: 'login',
      Dashboard: '',
    },
  },
};

/**
 * AppNavigator (web) — Volontairement limité au tableau de bord de
 * supervision, décision explicite : le scan, les itinéraires, le centre de
 * synchronisation, la carte et la déclaration d'anomalie restent des
 * fonctionnalités de terrain, mobiles uniquement (caméra, GPS en
 * arrière-plan, file d'attente SQLite hors-ligne n'ont pas leur place dans un
 * usage bureau/supervision).
 *
 * Metro sélectionne ce fichier automatiquement pour les builds web (suffixe
 * `.web.js`) : `AppNavigator.js` — avec ses onglets Tasks/Scan/Routes/Sync —
 * reste utilisé tel quel sur Android/iOS, sans aucune modification.
 */
export default function AppNavigator() {
  const { user, loading } = useAuthContext();
  if (loading) return null;

  return (
    <NavigationContainer linking={linking} fallback={null}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
