# LogiChain — Backend API

API industrielle de gestion de la chaîne logistique événementielle : traçabilité du matériel,
gestion des prestataires, empreinte carbone en temps réel, mode déconnecté sans perte de données.

## Architecture (N-Tier strict)

```
src/
  entities/       -> Objets métier (POO, validation "self-validating entity")
  models/schemas/  -> Schémas Mongoose (MongoDB) : GeoJSON, nested documents, Time Series
  repositories/    -> SEULE couche autorisée à toucher Mongoose/MongoDB
  services/       -> Toute la logique métier (calculs, règles, orchestration), agnostique HTTP
  controllers/    -> Reçoivent la requête HTTP, appellent un Service, renvoient la réponse
  routes/         -> Définition REST (verbes HTTP + URLs orientées ressources)
  middlewares/    -> Auth (JWT/RBAC), validation Joi, gestion centralisée des erreurs
  realtime/       -> WebSocket (Socket.IO) + SSE (fallback) pour les alertes critiques
  docs/openapi.yaml -> Spécification Swagger complète
```

Aucun composant en dehors d'un Repository n'importe un modèle Mongoose : c'est la règle
d'or de cette architecture (`Découpage architectural strict`).

## POO

- `BaseEntity` / `BaseRepository` sont abstraites (erreur si instanciées directement).
- Héritage : `EventEntity`, `ItemEntity`, `RouteEntity`, `UserEntity` héritent de `BaseEntity`.
  `EventRepository`, `ItemRepository`, etc. héritent de `BaseRepository`.
- Polymorphisme : `ItemEntity.canTransitionTo()` peut être surchargée par des sous-types
  de matériel plus spécialisés sans modifier le Service qui l'appelle.
- Encapsulation : les Repository sont les seuls à connaître Mongoose ; les Services ne
  connaissent que l'API des Repository.

## Démarrage

```bash
cp .env.example .env      # renseigner MONGO_URI, secrets JWT...
npm install
npm run dev                # ou npm start
node scripts/seed.js        # jeu de données de démonstration
node scripts/generate-qrcodes.js   # génère les fiches QR imprimables des items (voir assets/qrcodes/)
```

Swagger UI : http://localhost:4000/api-docs
Healthcheck : http://localhost:4000/health

Des QR codes de démonstration **déjà générés et vérifiés décodables** sont fournis
dans `assets/qrcodes/` (correspondant aux items du seed) — pratique pour tester
`ScanScreen` côté mobile sans matériel physique. Voir `assets/qrcodes/README.md`.

## Toutes les routes de l'API (26 chemins / 37 opérations)

CRUD complet sur chaque ressource métier (Create / Read / Update / Delete) :

| Ressource             | Create                        | Read                                                                                  | Update                                                                | Delete                                             |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| **Auth**              | `POST /auth/register`         | —                                                                                     | `POST /auth/refresh`                                                  | `POST /auth/logout`                                |
| **Users** _(admin)_   | via `/auth/register`          | `GET /users`, `GET /users/:id`                                                        | `PATCH /users/:id`                                                    | `DELETE /users/:id` _(désactivation)_              |
| **Events**            | `POST /events`                | `GET /events`, `/events/active`, `/events/:id`                                        | `PATCH /events/:id`                                                   | `DELETE /events/:id` _(refusé si items rattachés)_ |
| **Zones**             | `POST /events/:id/zones`      | `GET /events/:id/agent-zone`                                                          | —                                                                     | —                                                  |
| **Items**             | `POST /events/:eventId/items` | `GET .../items`, `/qr/:qrCode`, `/:id`                                                | `PATCH /:id` _(métadonnées)_, `PATCH /:id/scan`, `PATCH /:id/anomaly` | `DELETE /:id`                                      |
| **Sync offline**      | —                             | `GET .../items?updatedSince=` _(delta-sync)_                                          | `POST .../items/sync` _(lot d'actions)_                               | —                                                  |
| **Routes (feuilles)** | `POST /routes`                | `GET /routes` _(admin, tous transporteurs)_, `/routes/transporter/:id`, `/routes/:id` | `PATCH /routes/:id`, `PATCH /routes/:id/stops/:stopId/validate`       | `DELETE /routes/:id`                               |
| **Monitoring**        | —                             | `GET .../monitoring/{stock,carbon,carbon/history,bottlenecks}`                        | —                                                                     | —                                                  |
| **Realtime**          | —                             | `GET /realtime/stream/:eventId` _(SSE)_                                               | —                                                                     | —                                                  |

Détail complet, schémas et exemples : Swagger UI (`/api-docs`).

### Mode hors-ligne — ce que couvre l'API côté serveur

- `PATCH /items/:id/scan` et `/anomaly` exigent un `expectedVersion` : verrouillage
  optimiste, réponse `409` en cas de conflit plutôt qu'un écrasement silencieux.
- `POST /items/sync` reçoit un **lot** d'actions (capturées hors-ligne par le mobile,
  chacune avec son propre `expectedVersion`) et renvoie un rapport détaillé
  `{ applied: [...], conflicts: [...] }`, rejouable action par action.
- `GET /items?updatedSince=<date>` : **delta-sync**. Le mobile ne retélécharge que les
  items modifiés depuis sa dernière synchronisation, au lieu de tout le référentiel —
  important pour la performance sur un événement à plusieurs milliers d'items.

## Dépannage

### `unable to get image 'mongo:7'` / `dockerDesktopLinuxEngine... cannot find the file`

Docker Desktop n'est pas démarré (l'application, pas juste installée). Sur Windows :

1. Lance l'application **Docker Desktop** depuis le menu Démarrer et attends que l'icône
   dans la barre des tâches indique "Engine running" (peut prendre 1-2 minutes).
2. Vérifie que Docker est en mode **Linux containers** (clic droit sur l'icône →
   "Switch to Linux containers..." si l'option est proposée).
3. Relance `docker compose up -d` depuis la racine `logichain-platform/` (pas `backend/`).
4. Vérifie avec `docker ps` que le conteneur `logichain-mongo` est bien `healthy`.

### `Server selection timed out after 30000 ms` au démarrage du backend

Conséquence directe du point précédent : MongoDB n'est pas accessible sur `localhost:27017`.
Une fois `docker compose up -d` réussi et le conteneur `healthy`, relance `npm run dev`.

### Alternative sans Docker

Si Docker pose problème, tu peux utiliser une MongoDB gratuite hébergée sur
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (un cluster gratuit M0 supporte
les replica sets et donc les transactions ACID) : remplace simplement `MONGO_URI` dans
`backend/.env` par l'URI de connexion Atlas fournie sur leur dashboard.

## Points clés couvrant le cahier des charges

- **Offline-first / verrouillage optimiste** : chaque `Item` porte un champ `version`.
  Toute mise à jour doit fournir la version attendue (`expectedVersion`) ; en cas de
  décalage, l'API renvoie `409 Conflict` plutôt que d'écraser silencieusement les données.
  L'endpoint `POST /events/:eventId/items/sync` rejoue un lot d'actions hors-ligne et
  renvoie un rapport `{ applied, conflicts }` exploitable par le mobile pour un rollback visuel.
- **Empreinte carbone temps réel** : `CarbonService` + pipeline d'agrégation MongoDB
  (`ItemRepository.getCarbonAggregation`), historisé dans une collection **Time Series**
  dédiée au monitoring.
- **Résilience / charge** : `express-rate-limit`, pooling MongoDB (`maxPoolSize`), index
  composés et géospatiaux (`2dsphere`) pour absorber les pics de scan.
- **Sécurité** : Helmet, CORS restreint, JWT access/refresh, RBAC (`requireRole`),
  hachage bcrypt, validation Joi systématique en entrée.
- **REST niveau 2 (Richardson)** : verbes HTTP sémantiques, URLs orientées ressources
  (`/events/:id/items/:id/scan`), codes de statut explicites (200/201/400/401/404/409/422).
- **Temps réel** : `SocketManager` (WebSocket authentifié par JWT) et `SSEManager`
  (fallback `text/event-stream`), tous deux pilotés par `NotificationService`.
