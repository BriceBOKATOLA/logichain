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
npm start                 # puis « a » pour Android, « i » pour iOS
```

Un **seul** fichier est à adapter pour brancher l'application sur un backend :
[`src/config/env.js`](src/config/env.js). `ApiClient` (HTTP) et `SocketService`
(WebSocket) l'importent tous les deux — aucune URL n'est dupliquée ailleurs.

| Cible d'exécution  | Valeur de `HOST`             |
| ------------------ | ---------------------------- |
| Émulateur Android  | `http://10.0.2.2:4000`       |
| Simulateur iOS     | `http://localhost:4000`      |
| Téléphone physique | `http://<IP_LAN_DU_PC>:4000` |
| Production         | `https://logichain.online`   |

> Sur un téléphone physique, `localhost` désigne le téléphone lui-même : il
> faut impérativement l'IP LAN du poste de développement, et autoriser le port
> 4000 dans le pare-feu.

## Version web — tableau de bord de supervision

Le même code source (React Native + `react-native-web`) tourne aussi dans le
navigateur, servi par Nginx sur **le même domaine que l'API** :
<https://logichain.online>.

**Décision de scope volontaire** : le web se limite au **tableau de bord de
supervision multi-événements**. Le scan de matériel, les itinéraires, le
centre de synchronisation, la carte et la déclaration d'anomalie restent des
fonctionnalités de **terrain, mobiles uniquement** — elles reposent sur la
caméra, la localisation en arrière-plan et la file d'attente hors-ligne
SQLite, qui n'ont pas leur place dans un usage bureau/supervision. Cette
séparation est appliquée au niveau de l'arborescence, pas d'un simple masquage
visuel : `App.web.js` et `AppNavigator.web.js` (sélectionnés automatiquement
par Metro via le suffixe `.web.js`) n'importent tout simplement pas les
écrans, hooks ni dépendances natives concernés (caméra, SQLite, Leaflet) —
Metro les exclut donc entièrement du bundle web, qui est passé de 1,26 Mo à
725 Ko une fois ce périmètre resserré.

```bash
npm run web              # serveur de développement (expo start --web)
npm run build:web        # export statique de production -> frontend/web-build/
```

### Routes web

| Route    | Écran                                          |
| -------- | ----------------------------------------------- |
| `/`      | Tableau de bord — liste de tous les événements avec leurs indicateurs de stock |
| `/login` | Connexion                                        |

Le tableau de bord web ([`DashboardScreen.web.js`](src/screens/DashboardScreen.web.js))
diffère volontairement de celui du mobile
([`DashboardScreen.js`](src/screens/DashboardScreen.js)) : ce dernier reste
scopé au seul événement actif de l'agent connecté (`GET /events/active`),
tandis que la version web liste **tous** les événements
(`GET /events`) avec leur statut et leur répartition de stock — une vue de
supervision, pas une vue de terrain. Les indicateurs par événement nécessitent
un rôle `admin` ou `logistics_manager` (mêmes règles d'accès que l'API) ; un
autre rôle voit la liste des événements sans leurs statistiques plutôt qu'une
erreur bloquante.

### Différences plateforme

`ZoneMap.js` / `ZoneMap.web.js` (react-native-maps vs Leaflet+OpenStreetMap)
et le moteur SQLite web d'`expo-sqlite` (wa-sqlite/OPFS) restent dans le code
pour l'usage mobile, mais ne sont plus jamais chargés par le web depuis que
celui-ci se limite au Dashboard — voir la note de scope ci-dessus.

## Qualité et tests

```bash
npm run lint             # ESLint — zéro avertissement toléré
npm run format:check     # Prettier
npm test                 # 13 tests de la logique Offline-First
npm run test:ci          # avec rapport de couverture
```

Les tests utilisent le préréglage `jest-expo` ; les modules natifs (SQLite,
caméra, GPS, stockage) sont neutralisés dans
[`jest.setup.js`](jest.setup.js), ce qui rend la logique de synchronisation
testable sur un runner d'intégration continue sans appareil.

La suite couvre le cœur du fonctionnement Offline-First : application
optimiste avant l'empilement, mémorisation de l'état d'origine pour le
rollback, unicité des identifiants d'action, **absence de rollback automatique**
sur conflit, et non-perte des actions en cas de panne réseau.

## Design

Palette et tokens centralisés dans `src/theme/theme.js` (vert éco-responsable /
contraste élevé pensé pour une utilisation en extérieur). Aucune couleur ou taille
n'est codée en dur dans les écrans : tout référence `theme.js`.
