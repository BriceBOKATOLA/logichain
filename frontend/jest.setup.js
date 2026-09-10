/**
 * Mocks globaux des modules natifs Expo/React Native.
 *
 * Un runner de CI n'a ni appareil, ni caméra, ni GPS, ni base SQLite : ces
 * modules doivent être neutralisés une bonne fois pour toutes, sinon chaque
 * fichier de test devrait les remocker et les suites deviendraient illisibles.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 48.85, longitude: 2.35, accuracy: 5 },
  }),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Coupe le bruit des avertissements React Native pendant les tests, tout en
// laissant passer les vraies erreurs.
global.console.warn = jest.fn();
