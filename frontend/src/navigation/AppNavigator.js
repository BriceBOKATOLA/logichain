import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/Feather';
import { colors } from '../theme/theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TaskListScreen from '../screens/TaskListScreen';
import ScanScreen from '../screens/ScanScreen';
import SyncCenterScreen from '../screens/SyncCenterScreen';
import AnomalyDeclarationScreen from '../screens/AnomalyDeclarationScreen';
import MapScreen from '../screens/MapScreen';
import { useAuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = { Dashboard: 'home', Tasks: 'list', Scan: 'maximize', Sync: 'refresh-cw' };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => <Icon name={ICONS[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Sync" component={SyncCenterScreen} />
    </Tab.Navigator>
  );
}

/**
 * AppNavigator — Point d'assemblage de la navigation. Bascule Login <-> App
 * selon l'état d'authentification, sans logique métier additionnelle.
 */
export default function AppNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.textPrimary }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Anomaly" component={AnomalyDeclarationScreen} options={{ title: 'Anomalie' }} />
            <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Carte' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
