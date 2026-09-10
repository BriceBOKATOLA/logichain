/**
 * Configuration Jest du client mobile.
 *
 * Le préréglage `jest-expo` fournit la chaîne de transformation Babel de
 * React Native et les mocks des modules natifs : sans lui, le moindre `import`
 * d'un module Expo ferait échouer la suite dans un environnement Node pur
 * comme celui d'un runner GitHub Actions.
 */
module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  restoreMocks: true,

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],

  // Les paquets React Native sont publiés en ES Modules non transpilés : il
  // faut explicitement les faire passer par Babel. `uuid` (utilisé par
  // SyncService pour l'identifiant d'action) et `socket.io-client` sont dans
  // le même cas et doivent être ajoutés à cette liste.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|uuid|socket\\.io-client|engine\\.io-client))',
  ],

  collectCoverageFrom: ['src/services/**/*.js', 'src/utils/**/*.js', 'src/database/repositories/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov'],
};
