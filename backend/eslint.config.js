const js = require('@eslint/js');
const globals = require('globals');
const jest = require('eslint-plugin-jest');
const prettier = require('eslint-config-prettier');

/**
 * Configuration ESLint « flat config » (ESLint 9) du backend LogiChain.
 * Exécutée en local (`npm run lint`) ET par le job `lint` du pipeline CI :
 * une erreur ici bloque la Pull Request avant même les tests.
 */
module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'assets/**', 'src/docs/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // --- Qualité / lisibilité ---------------------------------------------
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // `ignoreRestSiblings` autorise l'idiome d'omission utilisé pour retirer
      // les champs sensibles d'un document : `const { passwordHash, ...safe } = user`.
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      'object-shorthand': ['error', 'properties'],

      // --- Garde-fous asynchrones -------------------------------------------
      // Une promesse non attendue dans un Service peut faire répondre le
      // Controller avant l'écriture MongoDB : erreur silencieuse en production.
      'require-await': 'error',
      'no-return-await': 'error',
      'no-async-promise-executor': 'error',

      // --- Sécurité ----------------------------------------------------------
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  {
    // Les scripts d'exploitation ont vocation à écrire sur la sortie standard.
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    plugins: { jest },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
      'no-console': 'off',
      'jest/expect-expect': 'error',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
    },
  },

  // Doit rester en DERNIER : neutralise les règles de style qui entreraient
  // en conflit avec Prettier (source unique de vérité sur le formatage).
  prettier,
];
