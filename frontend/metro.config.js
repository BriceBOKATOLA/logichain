const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite embarque son moteur SQLite web (wa-sqlite) sous forme de binaire
// .wasm. Metro ne sait pas résoudre cette extension par défaut : sans cette
// ligne, `expo export --platform web` échoue avec « Unable to resolve module
// ./wa-sqlite/wa-sqlite.wasm ».
config.resolver.assetExts.push('wasm');

// wa-sqlite persiste les données via OPFS (Origin Private File System), qui
// exige que la page soit servie en isolation d'origine croisée. Sans ces
// en-têtes, le navigateur refuse d'exposer `SharedArrayBuffer` et la base
// locale ne survit pas à un rechargement de page. Nécessaire ici pour le
// serveur de développement (`expo start --web`) ; l'équivalent en production
// est posé par Nginx (voir infra/ansible/roles/web_proxy).
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  },
};

module.exports = config;
