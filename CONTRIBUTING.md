# Guide de contribution — LogiChain

Bienvenue. Ce guide s'adresse à l'équipe qui reprend le projet : il donne de
quoi installer, développer, tester et livrer sans avoir à deviner quoi que ce
soit.

- Les règles de branches et de commits : [docs/GITFLOW.md](docs/GITFLOW.md)
- L'exploitation en production : [docs/RUNBOOK.md](docs/RUNBOOK.md)
- La politique de secrets : [docs/SECURITY.md](docs/SECURITY.md)

---

## 1. Installation locale

### 1.1 Prérequis

| Outil          | Version    | Vérification         | Requis pour          |
| -------------- | ---------- | -------------------- | -------------------- |
| Node.js        | **20 LTS** | `node --version`     | Backend et frontend  |
| npm            | ≥ 10       | `npm --version`      | Backend et frontend  |
| Docker Desktop | récent     | `docker --version`   | MongoDB en local     |
| Git            | ≥ 2.30     | `git --version`      | Tout                 |
| Ansible        | ≥ 2.16     | `ansible --version`  | Déploiement seulement (WSL sous Windows) |

> Node 20 est imposé par `engines` dans les deux `package.json` et vérifié par
> le rôle Ansible. Une version différente peut fonctionner en local mais
> divergera de la production — ce sont exactement les bogues les plus coûteux
> à diagnostiquer.

### 1.2 Récupérer le projet

```bash
git clone https://github.com/BriceBOKATOLA/logichain.git
cd logichain
```

Structure du mono-repo — voir l'argumentaire dans
[docs/adr/ADR-001-monorepo.md](docs/adr/ADR-001-monorepo.md) :

```
logichain/
├── backend/     API Node.js/Express, architecture N-Tier, MongoDB
├── frontend/    Application mobile React Native (Expo), Offline-First
├── infra/       Infrastructure as Code (Ansible)
├── docs/        Gitflow, Runbook, sécurité, décisions d'architecture
└── .github/     Pipelines CI/CD, modèles de PR et d'issues
```

### 1.3 Démarrer la base de données

```bash
docker compose up -d
```

Démarre MongoDB en **replica set à un nœud** (`rs0`), initialisé
automatiquement. Le replica set n'est pas un luxe : les transactions ACID
multi-documents utilisées par `RouteService.validateStop()` sont indisponibles
sur un `mongod` autonome.

```bash
# Vérification
docker compose ps
docker exec logichain-mongo mongosh --quiet --eval 'rs.status().myState'  # 1 = PRIMARY
```

### 1.4 Démarrer le backend

```bash
cd backend
cp .env.example .env      # les valeurs par défaut suffisent en local
npm install
npm run dev               # http://localhost:4000
```

Peupler la base avec un jeu de démonstration :

```bash
npm run db:seed
```

Comptes créés :

| Rôle           | Identifiant                  | Mot de passe   |
| -------------- | ---------------------------- | -------------- |
| Administrateur | `admin@logichain.io`         | `Admin1234!`   |
| Agent terrain  | `agent@logichain.io`         | `Agent1234!`   |
| Transporteur   | `transporteur@logichain.io`  | `Transp1234!`  |

Vérifications : <http://localhost:4000/health> et
<http://localhost:4000/api-docs>.

### 1.5 Démarrer l'application mobile

```bash
cd frontend
npm install
```

Adapter **l'unique** point de configuration réseau,
[`src/config/env.js`](frontend/src/config/env.js) :

| Cible d'exécution     | Valeur de `HOST`               |
| --------------------- | ------------------------------ |
| Émulateur Android     | `http://10.0.2.2:4000`         |
| Simulateur iOS        | `http://localhost:4000`        |
| Téléphone physique    | `http://<IP_LAN_DU_PC>:4000`   |

```bash
npm start          # puis « a » pour Android, « i » pour iOS
```

---

## 2. Variables d'environnement

Toutes sont validées au démarrage par
[`backend/src/config/env.js`](backend/src/config/env.js). Une valeur manquante
ou incohérente **empêche le démarrage** au lieu de produire un comportement
imprévisible en production.

| Variable                | Requise | Défaut          | Rôle                                                  |
| ----------------------- | ------- | --------------- | ----------------------------------------------------- |
| `NODE_ENV`              | non     | `development`   | `development` \| `test` \| `production`                |
| `PORT`                  | non     | `4000`          | Port d'écoute HTTP                                     |
| `MONGO_URI`             | **oui** | —               | URI MongoDB, avec `replicaSet` et `authSource`         |
| `JWT_ACCESS_SECRET`     | **oui** | —               | Signature des jetons d'accès (≥ 16 caractères)         |
| `JWT_REFRESH_SECRET`    | **oui** | —               | Signature des jetons de rafraîchissement (≥ 16 car.)   |
| `JWT_ACCESS_EXPIRES`    | non     | `15m`           | Durée de vie du jeton d'accès                          |
| `JWT_REFRESH_EXPIRES`   | non     | `7d`            | Durée de vie du jeton de rafraîchissement              |
| `CORS_ORIGIN`           | non     | `*`             | Origines autorisées, séparées par des virgules         |
| `TRUST_PROXY`           | non     | `0`             | Nombre de proxies de confiance (**1** derrière Nginx)  |
| `RATE_LIMIT_WINDOW_MS`  | non     | `60000`         | Fenêtre du rate-limit                                  |
| `RATE_LIMIT_MAX`        | non     | `300`           | Requêtes autorisées par fenêtre et par IP              |
| `LOG_LEVEL`             | non     | selon `NODE_ENV`| `error` \| `warn` \| `info` \| `debug`                  |

### Contrôles supplémentaires en production

Le démarrage est **refusé** si :

- un secret JWT vaut encore une valeur de démonstration (`change_me…`) ;
- les deux secrets JWT sont identiques ;
- `CORS_ORIGIN` vaut `*`.

### Ajouter une nouvelle variable

Trois fichiers doivent être modifiés **ensemble**, sans quoi la variable
fonctionnera en local et manquera en production :

1. `backend/src/config/env.js` — schéma de validation Joi
2. `backend/.env.example` — documentation pour les développeurs
3. `infra/ansible/roles/app_runtime/templates/env.j2` — injection en production

Si la valeur est un secret, l'ajouter aussi au Vault
(`infra/ansible/inventories/production/group_vars/vault.yml`) et à
`vault.yml.example`.

---

## 3. Qualité de code

### 3.1 Commandes

```bash
# Backend
cd backend
npm run lint            # ESLint, zéro avertissement toléré
npm run lint:fix        # correction automatique
npm run format          # Prettier
npm run format:check    # vérification sans écriture (utilisé par la CI)
npm test                # 87 tests : unitaires + intégration
npm run test:unit
npm run test:integration
npm run test:watch
npm run test:ci         # avec couverture

# Frontend
cd frontend
npm run lint
npm test
npm run test:ci

# Depuis la racine, pour les deux à la fois
npm run lint
npm test
```

### 3.2 Architecture backend à respecter

L'API suit une architecture **N-Tier stricte**. Chaque couche ne parle qu'à la
suivante :

```
Route  →  Middleware  →  Controller  →  Service  →  Repository  →  Modèle Mongoose
```

| Couche         | Responsabilité                       | Interdit                                        |
| -------------- | ------------------------------------ | ----------------------------------------------- |
| `routes/`      | Déclaration des URL, RBAC, validation | Toute logique                                    |
| `controllers/` | `req` → Service → `res`               | **Toute** règle métier, tout accès base          |
| `services/`    | Règles métier, orchestration          | Connaître `req`/`res`, importer un modèle Mongoose |
| `repositories/`| Accès MongoDB exclusif                | Contenir une règle métier                        |
| `entities/`    | Objets métier auto-validants          | Toute I/O                                        |

**Règle absolue** : aucun fichier hors de `repositories/` n'importe un modèle
Mongoose. C'est ce qui rend les Services testables sans base de données — et
ce qui a permis d'écrire les 54 tests unitaires de ce projet.

### 3.3 Écrire des tests

- **Unitaires** (`backend/tests/unit/`) — aucune I/O. Les dépendances sont
  substituées avec `jest.mock()`. Doivent s'exécuter en millisecondes.
- **Intégration** (`backend/tests/integration/`) — Express + Mongoose sur un
  replica set MongoDB en mémoire. Chaque test part d'une base vide.
- **Mobile** (`frontend/__tests__/`) — préréglage `jest-expo`, modules natifs
  neutralisés dans `jest.setup.js`.

Un test décrit un **comportement métier**, pas une implémentation :

```js
// Bien : décrit une règle, survivra à un refactoring
it("renvoie le même 401 générique pour un email inconnu et un mot de passe faux", …)

// Mal : décrit une mécanique interne, cassera au premier renommage
it('appelle bcrypt.compare', …)
```

---

## 4. Contribuer, étape par étape

```bash
# 1. Partir d'un develop à jour
git checkout develop && git pull origin develop

# 2. Créer la branche
git checkout -b feature/export-csv-inventaire

# 3. Développer, avec des commits atomiques et conventionnels
git commit -m "feat(api): ajoute l'export CSV de l'inventaire d'un événement"

# 4. Vérifier AVANT de pousser — c'est exactement ce que fera la CI
cd backend && npm run lint && npm test
cd ../frontend && npm run lint && npm test

# 5. Pousser et ouvrir la Pull Request vers develop
git push -u origin feature/export-csv-inventaire
```

Sur GitHub : Pull Request vers **`develop`** (jamais `main`), modèle rempli,
liste de contrôle cochée, revue demandée.

---

## 5. Contribuer à l'infrastructure

```bash
cd infra/ansible
ansible-galaxy collection install -r requirements.yml

ansible-lint playbooks/ roles/                   # obligatoire avant toute PR
ansible-playbook --syntax-check playbooks/site.yml
```

### Les deux règles de l'IaC sur ce projet

1. **Idempotence.** Un playbook exécuté dix fois de suite laisse le serveur
   dans le même état, sans erreur. Se vérifie ainsi :

   ```bash
   ansible-playbook -i inventories/production/hosts.yml playbooks/site.yml $VAULT
   ansible-playbook -i inventories/production/hosts.yml playbooks/site.yml $VAULT
   # Le second passage doit afficher changed=0
   ```

2. **Modules natifs.** `command` et `shell` sont proscrits sauf garde explicite
   (`creates:`, `when:`). Le projet n'en compte que trois, toutes gardées :
   génération du keyFile MongoDB, obtention du certificat Certbot, et
   `pm2 startup`. Toute nouvelle occurrence doit être justifiée en revue —
   `ansible-lint` la signalera de toute façon.

### Ne jamais commiter

- `vault.yml` en clair — il doit être chiffré par `ansible-vault encrypt`
- un fichier `.env`
- une clé privée SSH
- un mot de passe, un jeton ou une URI de connexion contenant des identifiants

Le pipeline `Sécurité` échoue sur ces fichiers, mais le premier filtre reste la
vigilance en revue.

---

## 6. Où trouver quoi

| Besoin                                | Fichier                                                    |
| ------------------------------------- | ---------------------------------------------------------- |
| Contrat de l'API                      | `backend/src/docs/openapi.yaml` (servi sur `/api-docs`)    |
| Configuration d'environnement         | `backend/src/config/env.js`                                |
| Connexion MongoDB et transactions     | `backend/src/config/database.js`                           |
| Verrouillage optimiste                | `backend/src/repositories/BaseRepository.js`               |
| Authentification et JWT               | `backend/src/services/AuthService.js`                      |
| Contrôle d'accès par rôle             | `backend/src/middlewares/authMiddleware.js`                |
| Synchronisation Offline-First         | `frontend/src/services/SyncService.js`                     |
| File d'attente hors-ligne (SQLite)    | `frontend/src/database/repositories/SyncQueueRepository.js`|
| Configuration réseau du mobile        | `frontend/src/config/env.js`                               |
| Provisionnement serveur               | `infra/ansible/roles/`                                     |
| Déploiement                           | `infra/ansible/playbooks/deploy.yml`                       |
| Pipelines                             | `.github/workflows/`                                       |

---

## 7. Questions fréquentes

**« `npm ci` échoue avec un conflit de peerDependencies sur le frontend. »**
Utiliser `npm ci --legacy-peer-deps` : l'écosystème Expo publie des plages de
peerDependencies plus strictes que la réalité. C'est ce que fait la CI.

**« Les tests d'intégration sont très lents au premier lancement. »**
`mongodb-memory-server` télécharge le binaire MongoDB (~80 Mo) une seule fois,
puis le met en cache.

**« Le mobile ne joint pas le backend depuis mon téléphone. »**
`localhost` désigne le téléphone, pas votre PC. Mettre l'IP LAN du poste dans
`frontend/src/config/env.js`, et vérifier que le pare-feu Windows autorise le
port 4000.

**« L'API refuse de démarrer avec une erreur de configuration. »**
C'est voulu. Le message nomme la variable fautive — voir §2.

**« Puis-je pousser directement sur `main` ? »**
Non. Les Branch Protection Rules l'interdisent, et le §2 de
[docs/GITFLOW.md](docs/GITFLOW.md) explique pourquoi.
