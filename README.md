# LogiChain — Plateforme complète (Backend + Frontend)

Un seul projet, deux applications qui se branchent l'une sur l'autre :

```
logichain-platform/
  backend/     -> API Node.js/Express + MongoDB (N-Tier, POO, Swagger, WebSocket/SSE)
  frontend/    -> Application mobile React Native (Offline-First, SQLite, Optimistic UI)
  docker-compose.yml -> MongoDB en Replica Set (nécessaire aux transactions ACID)
```

## Comment le front et le back sont branchés

Le branchement n'est pas qu'une histoire d'URL : voici le fil concret, du démarrage
du serveur jusqu'à l'écran de l'agent de terrain.

1. **Configuration réseau unique côté mobile** — `frontend/src/config/env.js` est le
   SEUL fichier à modifier pour pointer vers ton backend (adresse de l'émulateur,
   du simulateur ou du téléphone physique). `ApiClient.js` (HTTP) et
   `SocketService.js` (WebSocket) importent tous les deux cette config : jamais
   d'URL dupliquée ou codée en dur ailleurs.

2. **Authentification** — `LoginScreen` appelle `POST /auth/login` (backend). Les
   tokens JWT (access + refresh) sont stockés côté mobile ; `ApiClient` les
   attache automatiquement à chaque requête et gère le rafraîchissement en cas
   de 401.

3. **Branchement dynamique sur l'événement actif** — c'est le cœur de la
   connexion réelle entre les deux apps : dès qu'un utilisateur est authentifié,
   `EventContext` (frontend) appelle `GET /events/active` (nouvel endpoint
   backend, voir `EventService.getActiveEvent()`), met le résultat en cache
   SQLite, et expose `eventId` à toute l'application via `useEventContext()`.
   **Plus aucun identifiant d'événement en dur** dans les écrans — si le
   serveur est injoignable, le mobile retombe automatiquement sur le dernier
   événement mis en cache (`LocalEventRepository.getLastCached()`).

4. **Scan et synchronisation** — chaque scan (`useScanner` → `SyncService`)
   appelle en fin de compte `PATCH /events/:eventId/items/:id/scan` avec le
   `expectedVersion` connu localement. En cas de succès, la version locale est
   mise à jour ; en cas de conflit HTTP 409 (verrouillage optimiste côté
   MongoDB), l'action est marquée `conflict` dans la file locale et visible
   dans le **Centre de synchronisation**, jamais perdue.

5. **Alertes temps réel** — dès que l'événement actif est connu, le mobile
   ouvre une connexion WebSocket authentifiée par JWT (`SocketService.connect`)
   et rejoint la room `event:<eventId>`. Le backend y diffuse les alertes via
   `NotificationService` (déclaration d'anomalie, modification d'urgence de
   secteur…), reçues instantanément dans `DashboardScreen`.

Schéma résumé :

```
[Mobile] --POST /auth/login-------------------> [API] --JWT----> stockage local
[Mobile] --GET /events/active (JWT)-----------> [API] --Event--> cache SQLite (EventContext)
[Mobile] --PATCH /items/:id/scan (version)----> [API] --200/409-> file offline + Optimistic UI
[Mobile] <--WS event:<eventId> critical-alert-- [API] (NotificationService -> SocketManager)
```

## Démarrage pas à pas

### 1. Base de données

```bash
docker compose up -d
```

Cela démarre MongoDB en Replica Set à un nœud (`rs0`), initialisé automatiquement
par le conteneur `mongo-init`.

### 2. Backend

```bash
cd backend
cp .env.example .env      # vérifier MONGO_URI (replicaSet=rs0) et secrets JWT
npm install
npm run dev                # démarre sur http://localhost:4000
node scripts/seed.js        # crée un événement ACTIVE + items de démo + comptes
```

Vérifier que ça tourne : http://localhost:4000/health et http://localhost:4000/api-docs

Comptes créés par le seed :
- `admin@logichain.io` / `Admin1234!`
- `agent@logichain.io` / `Agent1234!`
- `transporteur@logichain.io` / `Transp1234!`

### 3. Frontend

```bash
cd frontend
# Adapter frontend/src/config/env.js :
#   - Émulateur Android -> http://10.0.2.2:4000
#   - Simulateur iOS    -> http://localhost:4000
#   - Téléphone physique -> http://<IP_LAN>:4000
npm install
npx pod-install ios   # si build iOS
npm run android        # ou npm run ios
```

Se connecter avec `agent@logichain.io` : l'app va automatiquement récupérer
l'événement `Festival Eco-Responsable 2026` créé par le seed (grâce à
`GET /events/active`) et afficher son tableau de bord, ses items scannables,
et activer la synchronisation offline pour cet événement.

## Où se trouve chaque exigence du cahier des charges

| Exigence | Emplacement |
|---|---|
| POO stricte backend | `backend/src/entities`, `backend/src/repositories` (classes, héritage, abstraction) |
| N-Tier strict | `backend/src/{entities,repositories,services,controllers,routes}` |
| Swagger | `backend/src/docs/openapi.yaml`, exposé sur `/api-docs` |
| REST niveau 2 Richardson | `backend/src/routes/*.routes.js` |
| MongoDB (nested docs, GeoJSON, Time Series) | `backend/src/models/schemas/*.js` |
| Verrouillage optimiste | `BaseRepository.updateWithOptimisticLock`, champ `version` |
| Offline-First mobile | `frontend/src/database` (SQLite), `frontend/src/services/SyncService.js` |
| Optimistic UI + rollback | `LocalItemRepository.applyOptimisticTransition` / `.rollback`, `SyncCenterScreen` |
| Views/Services séparés (mobile) | `frontend/src/screens` (vue) vs `frontend/src/hooks` + `services` (logique) |
| Temps réel | `backend/src/realtime` (WebSocket + SSE) ↔ `frontend/src/services/SocketService.js` |
| Empreinte carbone temps réel | `backend/src/services/CarbonService.js` + collection Time Series |

Chaque sous-dossier (`backend/`, `frontend/`) contient aussi son propre README
plus détaillé sur son architecture interne.
