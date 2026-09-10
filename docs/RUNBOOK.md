# Runbook d'exploitation — LogiChain

> Document destiné à l'équipe qui reprend l'exploitation de la plateforme.
> Il répond à trois questions : **comment déployer**, **comment revenir en
> arrière**, **comment sauvegarder et restaurer les données**.
>
> Chaque procédure est donnée telle qu'on la tape, sans étape implicite.

---

## 0. Fiche d'identité du serveur

| Élément                | Valeur                                              |
| ---------------------- | --------------------------------------------------- |
| Hébergeur              | Hostinger (VPS)                                     |
| Adresse IPv4           | `31.97.178.83`                                      |
| Nom de domaine         | `logichain.online`                                  |
| Système                | Ubuntu 22.04 LTS — 1 vCPU, 3,9 Go RAM, 49 Go disque |
| Accès SSH              | `ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83` |
| API                    | `https://logichain.online` (port interne 4000)      |
| Documentation OpenAPI  | `https://logichain.online/api-docs`                 |
| Sonde de santé         | `https://logichain.online/health`                   |
| Base de données        | MongoDB 7.0, replica set `rs0`, écoute sur `127.0.0.1` uniquement |
| Superviseur            | PM2 (`logichain-api`), service systemd `pm2-deploy` |
| Reverse proxy          | Nginx, TLS Let's Encrypt                            |
| Sauvegardes            | `/var/backups/logichain`, quotidiennes à 03 h 30, rétention 14 jours |

> **L'accès `root` par SSH est fermé.** L'administration se fait avec le compte
> `deploy`, puis `sudo`. C'est volontaire : chaque action reste imputable à une
> personne identifiée.

---

## 1. Préparer son poste (à faire une fois)

### 1.1 Prérequis

| Outil     | Version | Vérification            |
| --------- | ------- | ----------------------- |
| Ansible   | ≥ 2.16  | `ansible --version`     |
| Git       | ≥ 2.30  | `git --version`         |
| Client SSH| —       | `ssh -V`                |

> **Sous Windows**, Ansible ne fonctionne pas nativement : passer par WSL.
> ```powershell
> wsl --install -d Ubuntu
> ```
> puis, dans Ubuntu : `sudo apt update && sudo apt install -y ansible git`.
>
> Travailler dans le système de fichiers WSL (`~/logichain`) et **non** dans
> `/mnt/c/…` : Ansible ignore tout `ansible.cfg` situé dans un répertoire
> accessible en écriture par tous, ce qui est le cas des montages Windows.

### 1.2 Récupérer le projet et les collections

```bash
git clone https://github.com/BriceBOKATOLA/logichain.git ~/logichain
cd ~/logichain/infra/ansible
ansible-galaxy collection install -r requirements.yml
```

### 1.3 Installer la clé de déploiement

La clé privée `logichain_deploy` est détenue par le responsable technique et
stockée dans le gestionnaire de secrets de l'équipe. Elle n'est **jamais**
transmise par messagerie.

```bash
cp /chemin/vers/logichain_deploy ~/.ssh/
chmod 600 ~/.ssh/logichain_deploy
ssh-keyscan -H 31.97.178.83 >> ~/.ssh/known_hosts

# Vérification
ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83 'echo OK'
```

### 1.4 Obtenir le mot de passe du Vault

Le fichier `infra/ansible/inventories/production/group_vars/vault.yml` est
chiffré et **n'est pas dans le dépôt**. Il faut :

1. le récupérer auprès du responsable technique ;
2. le placer au chemin ci-dessus ;
3. enregistrer son mot de passe hors du dépôt :

```bash
printf '%s' 'LE_MOT_DE_PASSE' > ~/.logichain-vault-pass
chmod 600 ~/.logichain-vault-pass

# Vérification (doit afficher les clés vault_*)
ansible-vault view \
  --vault-password-file ~/.logichain-vault-pass \
  inventories/production/group_vars/vault.yml
```

---

## 2. Déployer

Toutes les commandes se lancent depuis `~/logichain/infra/ansible`.

Pour alléger la lecture, on pose une fois pour toutes :

```bash
export INV=inventories/production/hosts.yml
export VAULT='--extra-vars @inventories/production/group_vars/vault.yml --vault-password-file ~/.logichain-vault-pass'
```

### 2.1 Reconstruire intégralement le serveur (machine vierge)

**C'est la commande unique exigée par le cahier des charges.** Elle installe
le système, la sécurité, MongoDB, Nginx, Node.js, l'application et les
sauvegardes, dans cet ordre.

```bash
# Premier passage sur un serveur neuf où seul root existe :
ansible-playbook -i $INV playbooks/site.yml $VAULT -e ansible_user=root

# Tous les passages suivants (l'utilisateur `deploy` existe désormais) :
ansible-playbook -i $INV playbooks/site.yml $VAULT
```

Durée : environ 8 à 12 minutes sur une machine vierge, 1 à 2 minutes ensuite.

### 2.2 Déployer une nouvelle version du code (cas courant)

```bash
# Déploie la branche main
ansible-playbook -i $INV playbooks/deploy.yml $VAULT

# Déploie un commit précis — à privilégier : on met en production
# exactement ce qui a été testé, pas « la tête de main au moment du run ».
ansible-playbook -i $INV playbooks/deploy.yml $VAULT -e app_repo_version=a1b2c3d
```

Ce playbook, dans l'ordre :

1. sauvegarde la base (`avant-deploiement`) ;
2. clone le code dans `releases/<horodatage>` ;
3. installe les dépendances avec `npm ci --production` ;
4. synchronise les index MongoDB ;
5. bascule le lien `current` (opération atomique) ;
6. recharge PM2 **sans coupure** ;
7. vérifie `/health` en interne puis à travers Nginx.

### 2.3 Déployer automatiquement depuis GitHub

- Une fusion sur **`develop`** déclenche un déploiement automatique en recette.
- Une fusion sur **`main`** déclenche un déploiement en production **en
  attente de validation** : un approbateur doit cliquer sur *Review deployments*
  dans l'onglet Actions.
- Déploiement manuel : onglet **Actions → CD Déploiement → Run workflow**,
  choisir l'environnement et le playbook.

### 2.4 Vérifier qu'un déploiement s'est bien passé

```bash
# Depuis n'importe où
curl -fsS https://logichain.online/health
# Attendu : {"status":"ok","database":"connected",...}

# Sur le serveur
ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83
pm2 list                          # logichain-api doit être « online »
pm2 logs logichain-api --lines 50 # aucune erreur récente
ls -l /opt/logichain/current      # pointe sur la nouvelle release
```

### 2.5 Vérifier l'idempotence

Exigence du §5 du cahier des charges : dix exécutions consécutives laissent le
serveur dans le même état.

```bash
ansible-playbook -i $INV playbooks/site.yml $VAULT --check --diff
```

Un serveur déjà à jour doit afficher `changed=0` (aux mises à jour de paquets
publiées entre-temps près, qui sont un changement légitime de l'amont).

**Validé sur le serveur de production** : deux exécutions complètes et
consécutives de `playbooks/site.yml` (hors mode `--check`, en conditions
réelles) donnent respectivement `changed=18` (première release, TLS, comptes
MongoDB…) puis `changed=1` sur le second passage immédiat. L'unique tâche
« changée » est `backup : Exécuter une sauvegarde de vérification`, qui
produit délibérément une nouvelle archive à chaque exécution — c'est une
sauvegarde, elle est censée en créer une. Cela ne contredit pas l'exigence :
celle-ci porte sur l'état du système (services, configuration, code déployé),
qui reste rigoureusement identique d'un passage à l'autre.

---

## 3. Revenir en arrière (rollback)

> **Première question à se poser : le problème vient-il du CODE ou des
> DONNÉES ?**
> - Code (erreur 500, plantage au démarrage, régression fonctionnelle) → §3.1
> - Données (documents corrompus, migration ratée) → §4.3
> - Les deux → §3.1 **puis** §4.3

### 3.1 Rollback applicatif — retour à la release précédente

Le serveur conserve les 5 dernières releases. Le retour arrière consiste à
repointer le lien `current` : quelques secondes, sans téléchargement.

```bash
# Retour à la release immédiatement précédente
ansible-playbook -i $INV playbooks/rollback.yml $VAULT

# Retour à une release précise
ansible-playbook -i $INV playbooks/rollback.yml $VAULT -e rollback_to=20260910T143000
```

Le playbook affiche la liste des releases disponibles avant d'agir, sauvegarde
la base, bascule le lien, recharge PM2 et vérifie `/health`.

### 3.2 Rollback manuel (si Ansible est indisponible)

```bash
ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83

ls -1 /opt/logichain/releases/          # lister
readlink /opt/logichain/current         # release active

ln -sfn /opt/logichain/releases/20260910T143000 /opt/logichain/current
pm2 reload logichain-api --update-env

curl -fsS http://127.0.0.1:4000/health
```

### 3.3 L'application ne redémarre pas du tout

```bash
pm2 logs logichain-api --lines 200 --err   # 1. lire l'erreur réelle

# Cause la plus fréquente : une variable d'environnement manquante ou invalide.
# src/config/env.js refuse volontairement de démarrer plutôt que de tourner
# dans un état incohérent — le message d'erreur nomme la variable fautive.
sudo cat /opt/logichain/shared/.env

# 2. Vérifier que MongoDB tourne
sudo systemctl status mongod
mongosh --eval 'rs.status().myState'   # 1 = PRIMARY

# 3. Redémarrage complet en dernier recours
pm2 restart logichain-api
```

### 3.4 Annuler la mise en production côté Git

Le rollback serveur remet l'ancien code en service, mais `main` contient
toujours le commit fautif : le prochain déploiement le remettrait en place.

```bash
git checkout main && git pull origin main
git revert -m 1 <sha-du-commit-de-fusion>   # -m 1 : commit de fusion
git push origin main

# Puis répercuter sur develop (Règle 3 du Gitflow)
git checkout develop && git merge --no-ff main && git push origin develop
```

---

## 4. Sauvegardes MongoDB

### 4.1 Ce qui est en place

| Aspect          | Valeur                                                       |
| --------------- | ------------------------------------------------------------ |
| Fréquence       | Quotidienne, 03 h 30 (tâche cron `root`)                     |
| Emplacement     | `/var/backups/logichain/logichain-<horodatage>-<étiquette>.archive.gz` |
| Format          | `mongodump --archive --gzip` — un fichier unique compressé   |
| Rétention       | 14 jours, purge automatique                                  |
| Intégrité       | Chaque archive est testée (`gzip -t`) juste après création ; une archive corrompue est supprimée et l'exécution échoue |
| Journal         | `/var/log/logichain-backup.log` (rotation hebdomadaire)      |
| Automatiques    | Avant chaque déploiement et avant chaque rollback            |

### 4.2 Déclencher une sauvegarde manuelle

```bash
# Via Ansible (recommandé, traçable)
ansible-playbook -i $INV playbooks/backup.yml $VAULT -e backup_label=avant-migration

# Avec rapatriement de l'archive sur le poste local
ansible-playbook -i $INV playbooks/backup.yml $VAULT -e fetch_backup=true

# Directement sur le serveur
sudo /usr/local/bin/logichain-backup avant-migration
```

### 4.3 Restaurer une sauvegarde

> ⚠️ **La restauration REMPLACE les données actuelles.** Le script exige une
> confirmation explicite et prend lui-même une sauvegarde de sécurité avant
> d'écraser quoi que ce soit.

```bash
ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83

# 1. Lister les sauvegardes disponibles (affiche aussi leur taille)
sudo /usr/local/bin/logichain-restore

# 2. Prévisualiser : rien n'est modifié à cette étape
sudo /usr/local/bin/logichain-restore /var/backups/logichain/logichain-20260910-033000-auto.archive.gz

# 3. Exécuter réellement
sudo /usr/local/bin/logichain-restore /var/backups/logichain/logichain-20260910-033000-auto.archive.gz --force

# 4. Redémarrer l'API pour vider tout cache en mémoire
pm2 reload logichain-api --update-env
curl -fsS http://127.0.0.1:4000/health
```

### 4.4 Vérifier que les sauvegardes fonctionnent réellement

À faire **une fois par mois**. Une sauvegarde jamais restaurée n'est pas une
sauvegarde, c'est une hypothèse.

```bash
sudo tail -30 /var/log/logichain-backup.log     # dernières exécutions
ls -lh /var/backups/logichain/                  # 14 archives attendues
df -h /var/backups                              # espace disque

# Test de restauration sur une base jetable, sans toucher à la production
sudo mongorestore --host 127.0.0.1 --port 27017 \
  --username logichain_admin --password "$(sudo grep MONGO_PASSWORD /etc/logichain/backup.env | cut -d= -f2)" \
  --authenticationDatabase admin \
  --archive=/var/backups/logichain/<archive>.gz --gzip \
  --nsFrom 'logichain.*' --nsTo 'logichain_test_restauration.*'

mongosh -u logichain_admin --authenticationDatabase admin \
  --eval 'db.getSiblingDB("logichain_test_restauration").items.countDocuments()'

# Nettoyage
mongosh -u logichain_admin --authenticationDatabase admin \
  --eval 'db.getSiblingDB("logichain_test_restauration").dropDatabase()'
```

### 4.5 Copie hors-site

Les archives vivent sur le serveur qu'elles sauvegardent : elles ne protègent
pas d'une perte du VPS. À automatiser dès que possible.

```bash
# Rapatriement ponctuel
rsync -avz -e "ssh -i ~/.ssh/logichain_deploy" \
  deploy@31.97.178.83:/var/backups/logichain/ ./sauvegardes-logichain/
```

---

## 5. Exploitation courante

### 5.1 Consulter les journaux

```bash
pm2 logs logichain-api --lines 100          # application
sudo tail -f /var/log/nginx/logichain-access.log
sudo tail -f /var/log/nginx/logichain-error.log
sudo tail -f /var/log/mongodb/mongod.log
sudo journalctl -u mongod -f
sudo tail -f /var/log/logichain-backup.log
```

### 5.2 Surveiller la santé du serveur

```bash
pm2 monit                     # CPU / mémoire par worker
htop
df -h                         # saturation disque : cause n°1 des pannes MongoDB
free -m

# Requêtes lentes (> 200 ms) journalisées par MongoDB
sudo grep -i 'slow query' /var/log/mongodb/mongod.log | tail -20
```

### 5.3 Gérer les comptes utilisateurs

```bash
cd /opt/logichain/current/backend
node scripts/seed.js          # ⚠️ VIDE la base puis recrée le jeu de démonstration
node scripts/ensure-indexes.js  # idempotent, sans risque
```

### 5.4 Certificat TLS

```bash
sudo certbot certificates            # date d'expiration
sudo systemctl status certbot.timer  # renouvellement automatique actif ?
sudo certbot renew --dry-run         # simulation
sudo certbot renew && sudo systemctl reload nginx   # renouvellement forcé
```

### 5.5 Sécurité

```bash
sudo ufw status verbose              # seuls 22, 80 et 443 doivent être ouverts
sudo fail2ban-client status sshd     # IP bannies
sudo fail2ban-client set sshd unbanip 1.2.3.4   # débannir
sudo lastb | head -20                # tentatives de connexion échouées
```

---

## 6. Incidents fréquents

| Symptôme                                | Cause probable                           | Action                                                                 |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `/health` renvoie **503**               | MongoDB arrêté ou injoignable            | `sudo systemctl restart mongod` puis `mongosh --eval 'rs.status()'`     |
| `/health` ne répond pas (timeout)       | PM2 arrêté, ou Nginx en panne            | `pm2 list`, `sudo systemctl status nginx`                              |
| **502 Bad Gateway**                     | L'API ne tourne pas derrière Nginx       | `pm2 logs logichain-api --err`                                         |
| **429 Too Many Requests**               | Rate-limit atteint (Nginx ou Express)    | Normal en pic de scan ; sinon relever `RATE_LIMIT_MAX` dans `env.j2`   |
| L'API redémarre en boucle               | Variable d'environnement manquante       | `pm2 logs --err` : `env.js` nomme la variable fautive                  |
| WebSocket qui se coupe sans cesse       | Délai d'inactivité du proxy              | Vérifier `proxy_read_timeout 3600s` dans le vhost Nginx                |
| Disque plein                            | Releases ou sauvegardes accumulées       | `df -h`, puis abaisser `app_keep_releases` / `backup_retention_days`   |
| Le déploiement échoue sur `npm ci`      | `package.json` et `package-lock.json` désynchronisés | Relancer `npm install` en local et commiter le lock              |
| Rollback impossible (« 1 release »)     | Serveur fraîchement provisionné          | Redéployer une révision antérieure : `deploy.yml -e app_repo_version=<sha>` |
| Certificat expiré                       | Timer certbot inactif                    | `sudo systemctl enable --now certbot.timer && sudo certbot renew`      |

---

## 7. Procédure d'urgence — la production est tombée

```
1. CONSTATER
   curl -sS -o /dev/null -w '%{http_code}\n' https://logichain.online/health

2. QUALIFIER (2 minutes maximum)
   ssh -i ~/.ssh/logichain_deploy deploy@31.97.178.83
   pm2 list ; sudo systemctl status mongod nginx ; df -h

3. DÉCIDER
   ├─ Un déploiement vient d'avoir lieu ?      → ROLLBACK (§3.1)
   ├─ MongoDB est arrêté ?                     → sudo systemctl restart mongod
   ├─ Disque plein ?                           → purger releases et sauvegardes
   └─ Autre / cause inconnue ?                 → ROLLBACK quand même : restaurer
                                                 le service d'abord, comprendre ensuite

4. VÉRIFIER
   curl -fsS https://logichain.online/health

5. TRACER
   Ouvrir une issue « fix: … » décrivant le symptôme, la cause et l'action.
   Un incident non écrit est un incident qui se reproduira.
```

**Contact d'escalade** : responsable technique du projet (voir CODEOWNERS).

---

## 8. Ce qui reste à améliorer

Points connus, assumés, à traiter par l'équipe qui reprend :

1. **Copie hors-site des sauvegardes** — aujourd'hui manuelle (§4.5). À
   automatiser vers un stockage objet distant.
2. **Supervision et alerte** — aucune alerte automatique n'est levée si
   `/health` tombe. Une sonde externe (UptimeRobot ou équivalent) est le
   premier ajout à faire.
3. **Serveur de recette** — l'inventaire `staging` existe mais aucun VPS ne lui
   est associé : la recette se fait actuellement sur le poste des développeurs.
4. **Replica set à un seul nœud** — suffisant pour les transactions ACID, mais
   sans redondance : la perte du VPS entraîne une interruption de service.
5. **Rotation des secrets** — aucune procédure planifiée. À définir (les
   secrets JWT peuvent être renouvelés en modifiant le Vault et en redéployant,
   au prix d'une déconnexion de tous les agents).
6. **Migration d'Expo SDK 54** — l'audit du client mobile signale des
   vulnérabilités `high` situées dans l'arbre de dépendances interne d'Expo
   (`@expo/config`, `expo-constants`, `expo-asset`, `@expo/cli`). Aucune n'est
   corrigeable depuis ce dépôt : il faut migrer vers un SDK majeur supérieur,
   ce qui touche les modules natifs et exige une campagne de tests sur
   appareils réels. Le job `Audit des dépendances (mobile)` produit le rapport
   à chaque exécution sans bloquer le pipeline.
7. **Mise à jour des dépendances** — volontairement manuelle. Le job `Sécurité`
   s'exécute chaque lundi et signale les vulnérabilités ; c'est l'équipe qui
   décide de la montée de version, dans une branche `chore/`, avec la CI
   complète comme filet. Un robot ouvrant automatiquement une Pull Request par
   dépendance a été essayé puis retiré : le volume noyait la revue de code sans
   rien apporter que ce rapport hebdomadaire ne dise déjà.
