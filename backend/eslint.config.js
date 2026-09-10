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
      // `require-await` est volontairement DÉSACTIVÉ. Les Repositories et les
      // Services déclarent `async` même lorsqu'ils se contentent de retourner la
      // promesse de la couche inférieure : c'est un choix d'architecture, pas un
      // oubli. Retirer `async` changerait la sémantique d'erreur (une exception
      // synchrone remonterait au lieu d'être convertie en promesse rejetée, ce
      // qui court-circuiterait le try/catch des Controllers).
      'require-await': 'off',
      'no-return-await': 'error',
      'no-async-promise-executor': 'error',
      // Celle-ci reste la vraie garde-fou : une promesse ignorée dans un Service
      // ferait répondre le Controller avant l'écriture MongoDB.
      'no-promise-executor-return': 'error',

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
      // Les suites d'intégration s'appuient sur les assertions de Supertest
      // (`await request(app).get('/x').expect(401)`), qui sont de vraies
      // assertions même si elles ne passent pas par `expect()` de Jest.
      'jest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'request.**.expect', 'request.**.expect.**'] },
      ],
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
    },
  },

  // Doit rester en DERNIER : neutralise les règles de style qui entreraient
  // en conflit avec Prettier (source unique de vérité sur le formatage).
  prettier,
];
