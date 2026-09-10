/**
 * Configuration Jest du backend LogiChain.
 *
 * Deux projets distincts pour pouvoir lancer les suites séparément en CI :
 *  - `unit`        : aucune I/O, aucune base — exécution en millisecondes.
 *  - `integration` : Express + Mongoose branchés sur une instance MongoDB
 *                    éphémère (mongodb-memory-server), donc reproductible et
 *                    sans dépendance à un serveur externe dans le pipeline.
 */
module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  // Les tests d'intégration démarrent un serveur MongoDB en mémoire :
  // le téléchargement initial du binaire peut dépasser le timeout par défaut.
  testTimeout: 30000,

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
    '!src/config/swagger.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov'],

  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup-env.js'],
      clearMocks: true,
      restoreMocks: true,
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup-env.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-db.js'],
      clearMocks: true,
      restoreMocks: true,
      // Une base en mémoire par worker : on sérialise pour rester léger en CI.
      maxWorkers: 1,
    },
  ],
};
