# Infrastructure LogiChain

Infrastructure as Code du serveur de production. Toute modification du serveur
passe par ces fichiers — **aucune intervention manuelle en SSH** ne doit
subsister d'une exécution à l'autre, sans quoi la reproductibilité exigée au §5
du cahier des charges n'est plus garantie.

Pour les procédures d'exploitation (déployer, revenir en arrière, restaurer une
sauvegarde), voir [../docs/RUNBOOK.md](../docs/RUNBOOK.md).

---

## Arborescence

```
infra/ansible/
├── ansible.cfg                 configuration (à lancer depuis ce répertoire)
├── requirements.yml            collections Ansible requises
├── inventories/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       ├── logichain_servers.yml   variables NON sensibles (versionnées)
│   │       ├── vault.yml               secrets CHIFFRÉS AES-256 (versionnés ainsi)
│   │       └── vault.yml.example       modèle documentant la forme attendue
│   └── staging/                        structure identique
├── playbooks/
│   ├── site.yml                reconstruction intégrale du serveur
│   ├── deploy.yml              déploiement applicatif seul (utilisé par la CD)
│   ├── rollback.yml            retour à une release précédente
│   └── backup.yml              sauvegarde manuelle de la base
└── roles/
    ├── system_security/        paquets, utilisateur non-root, UFW, SSH, Fail2Ban
    ├── database/               MongoDB 7 : replica set, authentification, index
    ├── web_proxy/              Nginx, TLS Let's Encrypt, WebSocket, rate-limit
    ├── app_runtime/            Node.js 20, releases atomiques, PM2
    └── backup/                 mongodump quotidien, rotation, restauration
```

---

## Mise en route

```bash
cd infra/ansible
ansible-galaxy collection install -r requirements.yml
```

> **Sous Windows**, passer par WSL et travailler dans le système de fichiers
> Linux (`~/logichain`). Depuis `/mnt/c/…`, Ansible ignore `ansible.cfg` car le
> répertoire y est accessible en écriture par tous.

Récupérer le `vault.yml` chiffré et son mot de passe auprès du responsable
technique (procédure détaillée dans le Runbook, §1.4).

---

## Commandes courantes

```bash
export INV=inventories/production/hosts.yml
export VAULT='--extra-vars @inventories/production/group_vars/vault.yml --vault-password-file ~/.logichain-vault-pass'

# Reconstruction intégrale (machine vierge : ajouter -e ansible_user=root)
ansible-playbook -i $INV playbooks/site.yml $VAULT

# Déploiement d'une révision précise
ansible-playbook -i $INV playbooks/deploy.yml $VAULT -e app_repo_version=<sha>

# Retour arrière
ansible-playbook -i $INV playbooks/rollback.yml $VAULT

# Simulation : n'applique rien, montre ce qui changerait
ansible-playbook -i $INV playbooks/site.yml $VAULT --check --diff

# Un seul rôle
ansible-playbook -i $INV playbooks/site.yml $VAULT --tags database
```

Étiquettes disponibles : `system`, `security`, `database`, `mongodb`, `app`,
`deploy`, `web`, `nginx`, `tls`, `backup`, `verify`.

---

## Règles d'écriture

### Idempotence

Un playbook exécuté dix fois de suite laisse le serveur dans le même état, sans
erreur. Vérification :

```bash
ansible-playbook -i $INV playbooks/site.yml $VAULT   # 1er passage
ansible-playbook -i $INV playbooks/site.yml $VAULT   # doit afficher changed=0
```

### Modules natifs obligatoires

`command` et `shell` sont proscrits **sauf garde explicite**. Le projet n'en
compte que trois, toutes gardées :

| Commande                       | Garde                                | Pourquoi une commande est nécessaire                     |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| `openssl rand` (keyFile MongoDB) | `creates:` **et** `when:`           | Aucun module natif ne génère un keyFile ; le régénérer casserait le replica set |
| `certbot certonly`             | `creates:` sur le certificat         | Le module `community.crypto.acme_*` imposerait de gérer soi-même le challenge ACME |
| `pm2 startup`                  | `creates:` sur l'unité systemd       | PM2 génère lui-même son unité systemd                    |

Toute nouvelle occurrence doit être justifiée en revue — `ansible-lint` la
signalera de toute façon.

### Avant chaque Pull Request

```bash
ansible-lint playbooks/ roles/
ansible-playbook --syntax-check playbooks/site.yml
```

Le pipeline `Sécurité` rejoue ces deux contrôles.

### Secrets

Rien de sensible dans `group_vars/logichain_servers.yml` — ce fichier est
versionné en clair. Les secrets vivent dans `vault.yml`, versionné **uniquement
sous forme chiffrée** (le job « Sécurité » de la CI le vérifie à chaque
exécution) :

```bash
ansible-vault encrypt inventories/production/group_vars/vault.yml
ansible-vault edit    inventories/production/group_vars/vault.yml
```

Les clés **publiques** SSH dans `deploy_authorized_keys` sont, elles,
volontairement versionnées : cela documente qui a accès au serveur, et retirer
une ligne révoque l'accès au prochain passage du playbook.
