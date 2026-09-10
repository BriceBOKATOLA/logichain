# Politique de sécurité et gestion des secrets — LogiChain

Ce document répond à l'exigence §5 du cahier des charges : **« Aucune clé d'API
ou secret ne doit être commité en clair dans le dépôt Git. »**

---

## 1. La règle

> **Aucun secret ne rentre dans Git. Jamais. Sous aucun prétexte.**

Un secret commité doit être considéré comme **compromis dès la seconde où il
est poussé**, même si le commit est supprimé une minute plus tard : GitHub
conserve les objets Git orphelins, les forks en gardent copie, et les robots
d'indexation scannent les dépôts publics en continu.

Un secret est : un mot de passe, une clé d'API, un jeton, une clé privée SSH ou
TLS, une URI de connexion contenant des identifiants, un secret de signature JWT.

---

## 2. Où vit chaque secret

| Contexte             | Emplacement                                               | Protection                                    |
| -------------------- | --------------------------------------------------------- | --------------------------------------------- |
| Développement local  | `backend/.env`                                             | Exclu par `.gitignore` ; ne contient que des valeurs de démonstration |
| Production           | `/opt/logichain/shared/.env` sur le serveur                | Fichier `0600`, propriété de `deploy`, généré par Ansible |
| Source de vérité     | `infra/ansible/inventories/production/group_vars/vault.yml`| **Chiffré AES-256** par Ansible Vault, versionné sous cette forme |
| Pipelines CI/CD      | GitHub Secrets                                             | Chiffrés par GitHub, masqués dans les journaux |
| Mot de passe du Vault| Poste de chaque développeur + secret GitHub                | **Jamais** dans le dépôt, jamais par messagerie |

### Pourquoi `vault.yml` est versionné — et pourquoi ce n'est pas une entorse

Le fichier est versionné **uniquement sous sa forme chiffrée** : ce que Git
contient est un bloc AES-256 inexploitable sans le mot de passe. C'est la
pratique canonique d'Ansible, et elle a deux avantages concrets :

1. le pipeline de déploiement y accède directement, sans qu'un secret ait à
   transiter par un canal hors Git ;
2. l'historique du fichier documente **quand** un secret a été renouvelé, ce
   qui est précieux lors d'un incident.

L'exigence du §5 porte sur les secrets **en clair**. Elle est tenue par deux
garde-fous : le job `Sécurité` fait échouer le pipeline si un `vault.yml`
versionné ne commence pas par `$ANSIBLE_VAULT`, et le mot de passe qui l'ouvre
n'est jamais dans le dépôt.

Sont également versionnés `vault.yml.example` et `.env.example`, qui décrivent
la **forme** des secrets attendus sans en révéler aucune valeur.

---

## 3. Les cinq barrières mises en place

### Barrière 1 — `.gitignore` exhaustif

[`.gitignore`](../.gitignore) exclut `.env` et toutes ses variantes, `*.pem`,
`*.key`, `id_rsa*`, `*.keystore`, `.vault_pass`, et
`infra/ansible/inventories/**/vault.yml` — tout en conservant explicitement les
fichiers `.example`.

### Barrière 2 — Chiffrement Ansible Vault

```bash
cd infra/ansible
ansible-vault encrypt inventories/production/group_vars/vault.yml
ansible-vault view   inventories/production/group_vars/vault.yml
ansible-vault edit   inventories/production/group_vars/vault.yml
```

Un fichier chiffré commence par `$ANSIBLE_VAULT;1.1;AES256`. Même si le fichier
fuitait, son contenu resterait inexploitable sans le mot de passe.

### Barrière 3 — Analyse automatique de l'historique

Le pipeline [`Sécurité`](../.github/workflows/security.yml) exécute, sur chaque
push et chaque Pull Request :

- **Gitleaks** sur **tout l'historique** — pas seulement sur le dernier commit ;
- un contrôle explicite de la présence de fichiers interdits (`.env`, `*.pem`,
  `vault.yml`…) ;
- une vérification que tout `vault.yml` versionné est bien **chiffré** ;
- `npm audit` sur les deux sous-projets ;
- `ansible-lint`.

### Barrière 4 — Refus de démarrer avec des secrets faibles

[`backend/src/config/env.js`](../backend/src/config/env.js) refuse de démarrer
l'API en production si :

- un secret JWT vaut encore une valeur de démonstration (`change_me…`) ;
- les deux secrets JWT sont identiques ;
- un secret JWT fait moins de 16 caractères ;
- `CORS_ORIGIN` vaut `*`.

Ce comportement est verrouillé par des tests
([`tests/unit/env.test.js`](../backend/tests/unit/env.test.js)) : la protection
ne peut pas être retirée par inadvertance.

### Barrière 5 — Journalisation muette côté Ansible

Les tâches manipulant des secrets portent `no_log: true` : le contenu du
fichier `.env` généré n'apparaît jamais dans la sortie d'Ansible, ni dans les
journaux de GitHub Actions.

---

## 4. Générer des secrets robustes

```bash
openssl rand -hex 32       # secrets JWT (64 caractères hexadécimaux)
openssl rand -base64 24    # mots de passe MongoDB
ssh-keygen -t ed25519 -C 'logichain-deploy@ci' -f ~/.ssh/logichain_deploy
```

Ne jamais réutiliser un secret entre deux environnements : une fuite en recette
ne doit pas ouvrir la production.

---

## 5. Secrets GitHub requis

**Settings → Secrets and variables → Actions**

| Nom                       | Contenu                                              | Obtention                                |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `DEPLOY_SSH_KEY`          | Clé privée du compte `deploy`                         | `cat ~/.ssh/logichain_deploy`            |
| `ANSIBLE_VAULT_PASSWORD`  | Mot de passe déchiffrant `vault.yml`                  | Gestionnaire de secrets de l'équipe      |
| `DEPLOY_KNOWN_HOSTS`      | Empreinte SSH du serveur                              | `ssh-keyscan -H 31.97.178.83`            |

> `DEPLOY_KNOWN_HOSTS` n'est pas une précaution superflue : sans lui, il
> faudrait accepter aveuglément la clé d'hôte présentée, ce qui exposerait
> chaque déploiement à une attaque de l'intercepteur.

---

## 6. Que faire si un secret a fuité

> **Ordre impératif : révoquer d'abord, nettoyer ensuite.** Nettoyer
> l'historique sans révoquer ne protège de rien — le secret a déjà pu être
> copié.

### Étape 1 — Révoquer immédiatement (minutes qui suivent)

| Secret concerné      | Action                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| Secret JWT           | Générer un nouveau secret, mettre à jour le Vault, redéployer. **Tous les agents seront déconnectés** — c'est le prix à payer. |
| Mot de passe MongoDB | `db.changeUserPassword()` puis mise à jour du Vault et redéploiement           |
| Clé SSH              | Retirer la clé publique de `deploy_authorized_keys`, relancer `site.yml`, générer une nouvelle paire |
| Secret GitHub        | Le remplacer dans Settings, puis faire tourner le secret sous-jacent           |

### Étape 2 — Nettoyer l'historique

```bash
# Sauvegarde préalable — cette opération réécrit l'historique
git clone --mirror https://github.com/BriceBOKATOLA/logichain.git sauvegarde-avant-nettoyage

pip install git-filter-repo
git filter-repo --path chemin/vers/le/fichier-secret --invert-paths

git push --force --all
git push --force --tags
```

> ⚠️ Réécrire l'historique invalide tous les clones existants. Prévenir toute
> l'équipe : chacun devra recloner. C'est pénible — c'est aussi pourquoi la
> prévention prime.

### Étape 3 — Comprendre et corriger la cause

Ouvrir une issue décrivant comment le secret a échappé aux cinq barrières, et
ajouter la protection manquante. Un incident sans post-mortem se reproduit.

---

## 7. Durcissement du serveur

Mis en place par le rôle
[`system_security`](../infra/ansible/roles/system_security/) :

| Mesure                                   | Détail                                                          |
| ---------------------------------------- | --------------------------------------------------------------- |
| Connexion root SSH                       | **Interdite** (`PermitRootLogin no`)                            |
| Authentification par mot de passe        | **Interdite** (`PasswordAuthentication no`)                     |
| Comptes autorisés en SSH                 | `deploy` uniquement (`AllowUsers`)                              |
| Algorithmes SSH                          | Chiffrements et échanges de clés modernes uniquement            |
| Pare-feu                                 | UFW en `deny` par défaut ; seuls 22, 80 et 443 sont ouverts     |
| Bannissement automatique                 | Fail2Ban sur `sshd`, `nginx-http-auth` et `nginx-botsearch`     |
| Mises à jour de sécurité                 | `unattended-upgrades` activé                                     |
| MongoDB                                  | Écoute sur `127.0.0.1` seulement, authentification activée, keyFile pour le replica set |
| Compte applicatif MongoDB                | `readWrite` sur la seule base `logichain` — moindre privilège    |
| Fichier `.env` de production             | Mode `0600`, propriété de `deploy`                              |

Mesures applicatives complémentaires :

| Mesure                        | Emplacement                                          |
| ----------------------------- | ---------------------------------------------------- |
| En-têtes de sécurité HTTP     | Helmet (`backend/src/app.js`) + Nginx                |
| Rate-limiting                 | Nginx (`limit_req`) **et** Express, à deux niveaux   |
| Mots de passe                 | bcrypt, coût 12                                       |
| Refresh tokens                | Stockés en base sous forme d'empreinte SHA-256, jamais en clair |
| Validation des entrées        | Joi sur chaque route, avec `stripUnknown` — bloque l'escalade de privilège par champ non déclaré |
| Contrôle d'accès              | RBAC à quatre rôles, vérifié par middleware          |
| Réponses d'erreur             | Message générique en 500 : aucune fuite d'information interne |
| Anti-énumération de comptes   | 401 strictement identique pour email inconnu et mot de passe erroné |

---

## 8. Signaler une vulnérabilité

**Ne pas ouvrir d'issue publique.** Contacter directement le responsable
technique du projet (voir [CODEOWNERS](../.github/CODEOWNERS)) en décrivant :

1. le composant concerné ;
2. les étapes de reproduction ;
3. l'impact estimé ;
4. le cas échéant, un correctif proposé.
