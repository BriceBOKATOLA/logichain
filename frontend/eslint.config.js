const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jest = require('eslint-plugin-jest');
const prettier = require('eslint-config-prettier');

/**
 * Configuration ESLint du client mobile React Native / Expo.
 * Exécutée en local (`npm run lint`) et par le job `lint` du pipeline CI mobile.
 */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'coverage/**',
      'web-build/**',
      'babel.config.js',
      // Config Node.js pur (pas de contexte navigateur/React Native) : même
      // traitement que babel.config.js ci-dessus.
      'metro.config.js',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser, // fetch, navigator, setInterval… disponibles sous RN
        ...globals.es2022,
        __DEV__: 'readonly',
        require: 'readonly',
        module: 'writable',
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // React Native n'utilise pas le JSX runtime classique : pas besoin
      // d'importer React dans chaque fichier avec les versions récentes.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],

      // Un `console.log` oublié dans une application mobile pollue la console
      // de production et peut divulguer des données métier.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    files: ['__tests__/**/*.js', '**/*.test.js', 'jest.setup.js', 'jest.config.js'],
    plugins: { jest },
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
    rules: {
      ...jest.configs.recommended.rules,
      'no-console': 'off',
    },
  },

  prettier,
];
