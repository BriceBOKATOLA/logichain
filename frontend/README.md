# LogiChain — Application mobile terrain (React Native)

Application "Offline-First" pour les agents de terrain et prestataires : scan de matériel,
déclaration d'anomalies géolocalisées, synchronisation résiliente en zones blanches.

## Architecture (Views/Components vs Services/Hooks — anti "vibe coding")

```
src/
  screens/       -> Vues uniquement : rendu + capture d'événements utilisateur
  components/    -> Composants UI réutilisables (design system : src/theme/theme.js)
  hooks/         -> Logique métier exposée aux vues (useTasks, useScanner, useSync…)
  context/       -> État global partagé (Auth, Sync) via React Context
  services/      -> Logique métier pure + accès réseau (Api, Auth, Sync, Location, Socket)
  database/      -> SQLite embarqué (Offline-First) : db.js (singleton) + *Repository
```

Aucun écran n'appelle directement `fetch`/`axios` ou SQLite : tout transite par un
Service/Repository, exactement comme côté backend.

## Fonctionnement Offline-First

1. **Cache local systématique** : au premier chargement en ligne, les événements et
   items sont mis en cache dans SQLite (`LocalItemRepository`, `LocalEventRepository`).
2. **Optimistic UI** : un scan met à jour l'état localement et immédiatement
   (`applyOptimisticTransition`), sans attendre la réponse serveur.
3. **File d'attente locale** : chaque action est empilée dans `sync_queue` (SQLite) via
   `SyncQueueRepository`, avec un `clientActionId` unique (UUID) pour l'idempotence.
4. **Synchronisation en arrière-plan** : `SyncProvider` écoute `NetInfo` et déclenche
   `SyncService.flush()` automatiquement au retour réseau, ou manuellement depuis
   l'écran **Centre de synchronisation**.
5. **Conflits (verrouillage optimiste)** : si le serveur renvoie un conflit de version,
   l'action est marquée `conflict` (jamais perdue) et affichée à l'utilisateur, qui
   décide de rejouer ou d'abandonner — pas de rollback automatique invisible.

## Démarrage

```bash
npm install
npx pod-install ios      # si build iOS
npm run android           # ou npm run ios
```

Adapter `BASE_URL` dans `src/services/ApiClient.js` et `SOCKET_URL` dans
`src/services/SocketService.js` à l'adresse de votre backend LogiChain.

## Design

Palette et tokens centralisés dans `src/theme/theme.js` (vert éco-responsable /
contraste élevé pensé pour une utilisation en extérieur). Aucune couleur ou taille
n'est codée en dur dans les écrans : tout référence `theme.js`.
