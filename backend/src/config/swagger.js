const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

/**
 * Charge la spécification OpenAPI 3.0 statique (docs/openapi.yaml) et
 * expose le middleware Swagger UI. Garder la spec en YAML permet de la
 * versionner indépendamment de l'implémentation des routes.
 */
function mountSwagger(app) {
  const specPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
  const swaggerDocument = YAML.load(specPath);

  // La Content-Security-Policy par défaut de Helmet (posée globalement dans app.js)
  // bloque les scripts inline utilisés par la page Swagger UI. On la retire
  // spécifiquement sur cette route plutôt que de désactiver Helmet partout.
  app.use('/api-docs', (req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    next();
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'LogiChain API Docs',
    }),
  );
  app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));
}

module.exports = { mountSwagger };
