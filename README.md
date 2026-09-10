# LogiChain — Plateforme de logistique événementielle

[![CI Backend](https://github.com/BriceBOKATOLA/logichain/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/BriceBOKATOLA/logichain/actions/workflows/ci-backend.yml)
[![CI Mobile](https://github.com/BriceBOKATOLA/logichain/actions/workflows/ci-mobile.yml/badge.svg)](https://github.com/BriceBOKATOLA/logichain/actions/workflows/ci-mobile.yml)
[![Sécurité](https://github.com/BriceBOKATOLA/logichain/actions/workflows/security.yml/badge.svg)](https://github.com/BriceBOKATOLA/logichain/actions/workflows/security.yml)

Traçabilité du matériel événementiel en temps réel : scan de QR codes,
fonctionnement hors-ligne pour les agents de terrain, tableau de bord logistique
et calcul d'empreinte carbone.

**Production** : <https://logichain.online> — [API](https://logichain.online/api-docs) · [Santé](https://logichain.online/health)

---

## Table des matières

| Vous voulez…                              | Lisez                                            |
| ----------------------------------------- | ------------------------------------------------ |
| Installer et développer en local          | [CONTRIBUTING.md](CONTRIBUTING.md)               |
| Comprendre les branches et les commits    | [docs/GITFLOW.md](docs/GITFLOW.md)               |
| Déployer, revenir en arrière, sauvegarder | [docs/RUNBOOK.md](docs/RUNBOOK.md)               |
| Comprendre la gestion des secrets         | [docs/SECURITY.md](docs/SECURITY.md)             |
| Savoir pourquoi c'est un mono-repo        | [docs/adr/ADR-001-monorepo.md](docs/adr/ADR-001-monorepo.md) |

---

## 1. Structure du dépôt

```
logichain/
├── backend/              API Node.js/Express — N-Tier, POO, MongoDB, Swagger, WebSocket
│   ├── src/
│   │   ├── entities/       objets métier auto-validants
│   │   ├── repositories/   accès MongoDB EXCLUSIF
│   │   ├── services/       règles métier
│   │   ├── controllers/    HTTP uniquement
│   │   ├── routes/         URL, RBAC, validation Joi
│   │   ├── middlewares/    authentification, validation, erreurs
│   │   ├── realtime/       WebSocket (Socket.IO) et SSE
│   │   └── config/         environnement, base de données, Swagger
│   ├── tests/              54 unitaires + 33 d'intégration
│   └── scripts/            seed, index, génération de QR codes
│
├── frontend/             Application mobile React Native (Expo) — Offline-First
│   ├── src/
│   │   ├── screens/        vues
│   │   ├── hooks/          logique de présentation
│   │   ├── services/       HTTP, synchronisation, scanner, WebSocket
│   │   ├── database/       SQLite locale et file d'attente hors-ligne
│   │   └── context/        authentification, événement actif, synchronisation
│   └── __tests__/          13 tests de la logique Offline-First
│
├── infra/ansible/        Infrastructure as Code
│   ├── roles/              system_security · database · web_proxy · app_runtime · backup
│   ├── playbooks/          site · deploy · rollback · backup
│   └── inventories/        production · staging (+ Vault chiffré)
│
├── docs/                 Gitflow · Runbook · Sécurité · Décisions d'architecture
├── .github/workflows/    CI backend · CI mobile · CD déploiement · Sécurité · Convention de commit
└── docker-compose.yml    MongoDB en replica set pour le développement local
```

> Le `package.json` racine **ne déclare aucune dépendance** : c'est un manifeste
> d'orchestration. Chaque sous-projet gère les siennes. Voir
> [ADR-001](docs/adr/ADR-001-monorepo.md).

---

## 2. Démarrage rapide

```bash
git clone https://github.com/BriceBOKATOLA/logichain.git
cd logichain

# 1. MongoDB en replica set (requis par les transactions ACID)
docker compose up -d

# 2. API
cd backend
cp .env.example .env
npm install
npm run db:seed        # jeu de démonstration : 1 événement actif, 3 comptes, 3 items
npm run dev            # http://localhost:4000

# 3. Application mobile (autre terminal)
cd ../frontend
npm install
# Adapter src/config/env.js à votre cible (émulateur / simulateur / téléphone)
npm start
```

Comptes de démonstration : `admin@logichain.io` / `Admin1234!` ·
`agent@logichain.io` / `Agent1234!` · `transporteur@logichain.io` / `Transp1234!`

Détails complets, variables d'environnement et dépannage :
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## 3. Comment le mobile et l'API sont branchés

1. **Un seul point de configuration réseau** — `frontend/src/config/env.js` est
   le SEUL fichier à modifier pour pointer vers un backend. `ApiClient` (HTTP)
   et `SocketService` (WebSocket) l'importent tous les deux : aucune URL n'est
   dupliquée ailleurs.

2. **Authentification** — `LoginScreen` appelle `POST /auth/login`. Les jetons
   JWT sont stockés localement ; `ApiClient` les attache automatiquement et
   gère le rafraîchissement sur 401.

3. **Branchement automatique sur l'événement actif** — dès l'authentification,
   `EventContext` appelle `GET /events/active`, met le résultat en cache SQLite
   et l'expose à toute l'application. Aucun identifiant d'événement n'est codé
   en dur ; si le serveur est injoignable, le mobile repart du dernier
   événement mis en cache.

4. **Scan et synchronisation** — chaque scan applique une transition locale
   immédiate (Optimistic UI) puis empile l'action dans SQLite. Au retour du
   réseau, la file part en un seul lot. Un conflit HTTP 409 (verrouillage
   optimiste MongoDB) marque l'action comme `conflict` dans le Centre de
   synchronisation — **elle n'est jamais perdue ni annulée silencieusement**.

5. **Alertes temps réel** — le mobile ouvre une connexion WebSocket
   authentifiée par JWT et rejoint la room `event:<eventId>`. Le backend y
   diffuse les alertes critiques.

```
[Mobile] --POST /auth/login-------------------> [API] --JWT-----> stockage local
[Mobile] --GET /events/active (JWT)-----------> [API] --Event---> cache SQLite
[Mobile] --POST /events/:id/items/sync--------> [API] --200/409-> file hors-ligne
[Mobile] <--WS event:<eventId> alerte---------- [API]
```

---

## 4. Infrastructure et déploiement

### Le serveur en une commande

```bash
cd infra/ansible
ansible-playbook -i inventories/production/hosts.yml playbooks/site.yml \
  --extra-vars "@inventories/production/group_vars/vault.yml" \
  --vault-password-file ~/.logichain-vault-pass
```

Cette commande, depuis une machine **vierge**, installe et configure : sécurité
système, MongoDB, Nginx, Node.js, l'application et les sauvegardes.

### Les rôles Ansible

| Rôle              | Ce qu'il fait                                                                    |
| ----------------- | -------------------------------------------------------------------------------- |
| `system_security` | Mises à jour, utilisateur non-root, UFW (deny par défaut), SSH durci, Fail2Ban    |
| `database`        | MongoDB 7 en replica set, authentification + keyFile, écoute locale, index        |
| `web_proxy`       | Nginx, TLS Let's Encrypt, WebSocket, rate-limit, en-têtes de sécurité             |
| `app_runtime`     | Node.js 20, releases atomiques, `npm ci --production`, PM2 cluster, rechargement sans coupure |
| `backup`          | `mongodump` quotidien avec contrôle d'intégrité, rotation, script de restauration |

**Idempotence** : uniquement des modules natifs Ansible. Les trois seules
commandes shell (keyFile MongoDB, Certbot, `pm2 startup`) sont protégées par une
garde `creates:`. `ansible-lint` passe au profil `production`.

### Pipelines

| Workflow                | Déclencheur                     | Ce qu'il fait                                                     |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `CI Backend`            | push / PR sur `main`, `develop` | ESLint, Prettier, 54 tests unitaires, 33 d'intégration, couverture |
| `CI Mobile`             | push / PR sur `main`, `develop` | ESLint, Prettier, 13 tests, expo-doctor, build du bundle           |
| `Convention de commit`  | PR                              | Conventional Commits sur les commits et le titre de PR             |
| `Sécurité`              | push / PR / hebdomadaire        | Gitleaks, fichiers interdits, Vault chiffré, `npm audit`, ansible-lint |
| `CD Déploiement`        | push sur `develop` / `main`     | `develop` → recette (auto) · `main` → production (sur validation)  |

Le déploiement exécute d'abord le playbook en `--check --diff` (preuve
d'idempotence), déploie le SHA exact du commit validé, puis lance un test de
fumée externe sur `/health`.

---

## 5. Flux de travail

```
feature/*  →  develop  →  release/*  →  main  →  production
```

- Une feature ne fusionne **jamais** directement sur `main`.
- Aucun push direct : tout passe par Pull Request avec revue et CI verte.
- Après toute fusion sur `main`, on re-fusionne `main` dans `develop`.

Règles complètes, Branch Protection Rules et scénarios pas à pas :
[docs/GITFLOW.md](docs/GITFLOW.md).

---

## 6. Où se trouve chaque exigence

### Parties 1 et 2 — Application

| Exigence                                | Emplacement                                                  |
| --------------------------------------- | ------------------------------------------------------------ |
| POO stricte                             | `backend/src/entities/`, `backend/src/repositories/`         |
| N-Tier strict                           | `backend/src/{entities,repositories,services,controllers,routes}` |
| Swagger / OpenAPI                       | `backend/src/docs/openapi.yaml`, servi sur `/api-docs`       |
| REST niveau 2 de Richardson             | `backend/src/routes/*.routes.js`                             |
| MongoDB (documents imbriqués, GeoJSON, Time Series) | `backend/src/models/schemas/`                     |
| Verrouillage optimiste                  | `BaseRepository.updateWithOptimisticLock`                    |
| Transactions ACID                       | `backend/src/config/database.js` (`withTransaction`)         |
| Offline-First                           | `frontend/src/database/`, `frontend/src/services/SyncService.js` |
| Optimistic UI et rollback               | `LocalItemRepository`, `SyncCenterScreen`                    |
| Temps réel                              | `backend/src/realtime/` ↔ `frontend/src/services/SocketService.js` |
| Empreinte carbone                       | `backend/src/services/CarbonService.js`                      |

### Partie 3 — DevOps

| Exigence                                | Emplacement                                                  |
| --------------------------------------- | ------------------------------------------------------------ |
| Structure de dépôts argumentée          | [docs/adr/ADR-001-monorepo.md](docs/adr/ADR-001-monorepo.md) |
| Stratégie de branching Gitflow          | [docs/GITFLOW.md](docs/GITFLOW.md)                           |
| Règles de PR et revue obligatoire       | [docs/GITFLOW.md §6-7](docs/GITFLOW.md), `.github/CODEOWNERS`, `.github/pull_request_template.md` |
| Conventional Commits                    | `commitlint.config.js`, `.github/workflows/commit-convention.yml` |
| Documentation de passation              | [CONTRIBUTING.md](CONTRIBUTING.md)                           |
| Rôle System & Security                  | `infra/ansible/roles/system_security/`                       |
| Rôle Database                           | `infra/ansible/roles/database/`                              |
| Rôle Web & Proxy (TLS)                  | `infra/ansible/roles/web_proxy/`                             |
| Rôle Application Runtime (PM2)          | `infra/ansible/roles/app_runtime/`                           |
| Pipelines de validation automatisée     | `.github/workflows/ci-backend.yml`, `ci-mobile.yml`          |
| Déploiement continu                     | `.github/workflows/cd-deploy.yml`                            |
| Étanchéité des secrets                  | [docs/SECURITY.md](docs/SECURITY.md), `.gitignore`, Ansible Vault |
| Idempotence des playbooks               | Modules natifs, `ansible-lint` profil production, mode `--check` en CD |
| Reproductibilité intégrale              | `infra/ansible/playbooks/site.yml` (une seule commande)       |
| Runbook (déploiement, rollback, sauvegardes) | [docs/RUNBOOK.md](docs/RUNBOOK.md)                      |

---

## 7. Pile technique

| Couche          | Technologies                                                     |
| --------------- | ---------------------------------------------------------------- |
| API             | Node.js 20, Express 4, Mongoose 8, Joi, JWT, bcrypt, Socket.IO, Winston |
| Base de données | MongoDB 7 (replica set, GeoJSON, Time Series, transactions ACID) |
| Mobile          | React Native 0.81, Expo 54, SQLite, Axios, React Navigation      |
| Qualité         | ESLint 9, Prettier 3, Jest 29, Supertest, mongodb-memory-server  |
| Infrastructure  | Ansible 2.16, Nginx, PM2, UFW, Fail2Ban, Certbot                 |
| CI/CD           | GitHub Actions, Gitleaks, ansible-lint, Dependabot               |
