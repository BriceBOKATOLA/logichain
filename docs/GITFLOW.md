# Stratégie de branching — LogiChain

Ce document est la référence contractuelle du travail collaboratif sur le dépôt.
Il décrit ce qui est **autorisé**, ce qui est **interdit**, et **pourquoi**.

---

## 1. Le modèle en une image

```
                                      ┌──────────── tag v1.1.0
                                      │
main      ●───────────────────────────●──────────────●────────────▶  PRODUCTION
           \                         /              /
            \                       /              /  (hotfix)
release/*    \            ●───●────●              /
              \          /                       /
develop        ●────●───●─────────────●─────────●──────────────────▶  RECETTE
                \      /               \       /
feature/*        ●────●                 ●─────●
                 (une fonctionnalité)   (une autre)
```

| Branche      | Rôle                                      | Durée de vie | Protégée |
| ------------ | ----------------------------------------- | ------------ | -------- |
| `main`       | Reflète **exactement** la production       | Permanente   | Oui      |
| `develop`    | Intégration continue, déployée en recette  | Permanente   | Oui      |
| `feature/*`  | Une fonctionnalité, un correctif ordinaire | Éphémère     | Non      |
| `release/*`  | Stabilisation avant mise en production     | Éphémère     | Non      |
| `hotfix/*`   | Correction urgente en production           | Éphémère     | Non      |

---

## 2. Les trois règles non négociables

### Règle 1 — `main` ne reçoit **jamais** une `feature/*` directement

Une fonctionnalité part de `develop` et y retourne. Elle n'atteint `main` qu'à
travers une branche `release/*`.

**Pourquoi.** `main` est censée être déployable à tout instant. Si une feature
y fusionne directement, elle n'a jamais été confrontée aux autres features
fusionnées entre-temps : deux changements corrects isolément peuvent se
contredire une fois réunis. `develop` est précisément l'endroit où cette
confrontation a lieu, avant que le client ne la subisse.

### Règle 2 — Aucun `push` direct sur `main` ni sur `develop`

Tout changement passe par une Pull Request, avec au moins une revue approuvée
et une CI verte.

**Pourquoi.** La revue de code n'est pas une formalité de politesse : c'est le
seul moment où une seconde personne comprend le changement. Sur un projet
transmis à une autre équipe, c'est aussi le mécanisme principal de transfert de
connaissance.

### Règle 3 — Après toute fusion sur `main`, on **re-fusionne `main` dans `develop`**

```bash
git checkout develop
git merge --no-ff main
git push origin develop
```

**Pourquoi.** Une release ou un hotfix ajoute des commits à `main` que `develop`
ne connaît pas. Sans ce back-merge, les deux branches divergent, et chaque
Pull Request suivante affiche des conflits qui n'ont rien à voir avec son
contenu. C'est l'erreur la plus fréquente — et la plus coûteuse — en Gitflow.

---

## 3. Nommage des branches

| Préfixe     | Format                          | Exemple                              |
| ----------- | ------------------------------- | ------------------------------------ |
| `feature/`  | `feature/<description-courte>`  | `feature/export-csv-inventaire`      |
| `fix/`      | `fix/<description-courte>`      | `fix/conflit-409-non-affiche`        |
| `hotfix/`   | `hotfix/<description-courte>`   | `hotfix/fuite-memoire-websocket`     |
| `release/`  | `release/<version-semver>`      | `release/1.2.0`                      |
| `chore/`    | `chore/<description-courte>`    | `chore/montee-node-22`               |

En minuscules, mots séparés par des tirets, en français ou en anglais mais de
façon cohérente au sein d'une même branche. Pas d'accents (certains outils Git
les gèrent mal sous Windows).

---

## 4. Les scénarios, pas à pas

### 4.1 Développer une fonctionnalité

```bash
# Toujours repartir d'un develop à jour : partir d'une base périmée, c'est
# programmer un conflit pour plus tard.
git checkout develop
git pull origin develop

git checkout -b feature/export-csv-inventaire

# … développement, avec des commits atomiques et conventionnels …
git add backend/src/services/ExportService.js
git commit -m "feat(api): ajoute l'export CSV de l'inventaire d'un événement"

git push -u origin feature/export-csv-inventaire
```

Puis, sur GitHub : **New Pull Request**, base `develop`, compare
`feature/export-csv-inventaire`. Remplir le modèle de PR, cocher la liste de
contrôle, demander une revue.

### 4.2 Préparer une mise en production

```bash
git checkout develop && git pull origin develop
git checkout -b release/1.2.0

# Sur cette branche : uniquement de la stabilisation — montée du numéro de
# version, correction de bogues détectés en recette, mise à jour du CHANGELOG.
# AUCUNE nouvelle fonctionnalité : c'est ce qui distingue une release d'une
# rallonge de develop.
git commit -am "chore(repo): passe la version à 1.2.0"
git push -u origin release/1.2.0
```

Deux Pull Requests :

1. `release/1.2.0` → **`main`** (la mise en production)
2. `release/1.2.0` → **`develop`** (récupération des correctifs de stabilisation)

Puis on étiquette la version sur `main` :

```bash
git checkout main && git pull origin main
git tag -a v1.2.0 -m "Version 1.2.0 — export CSV et corrections de synchronisation"
git push origin v1.2.0
```

**Pourquoi étiqueter.** Le tag est la seule façon fiable de répondre à « quel
code tournait en production le 12 mars ? » — un jour, cette question sera posée
pendant un incident.

### 4.3 Corriger en urgence un bogue de production

```bash
# Un hotfix part de main, PAS de develop : develop contient déjà des
# fonctionnalités non validées qu'on ne veut surtout pas embarquer dans un
# correctif d'urgence.
git checkout main && git pull origin main
git checkout -b hotfix/fuite-memoire-websocket

git commit -am "fix(api): libère les écouteurs Socket.IO à la déconnexion"
git push -u origin hotfix/fuite-memoire-websocket
```

Deux Pull Requests, exactement comme pour une release : vers `main`, **puis**
vers `develop`. Oublier la seconde ferait réapparaître le bogue à la prochaine
release.

---

## 5. Politique de commit — Conventional Commits

### Format

```
<type>(<portée>): <description à l'impératif>

[corps optionnel expliquant le POURQUOI]

[pied de page optionnel : BREAKING CHANGE, Closes #123]
```

### Types autorisés

| Type       | Usage                                                |
| ---------- | ---------------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                              |
| `fix`      | Correction de bogue                                  |
| `docs`     | Documentation seule                                  |
| `style`    | Formatage, sans changement de comportement           |
| `refactor` | Réécriture sans ajout ni correction                  |
| `perf`     | Amélioration de performance                          |
| `test`     | Ajout ou correction de tests                         |
| `build`    | Build, dépendances                                   |
| `ci`       | Pipelines d'intégration continue                     |
| `chore`    | Outillage, nettoyage                                 |
| `revert`   | Annulation d'un commit                               |

### Portées attendues

`api`, `backend`, `mobile`, `frontend`, `infra`, `ansible`, `ci`, `docs`,
`deps`, `repo`.

### Exemples

```
feat(api): ajoute la synchronisation par lot des scans hors-ligne

Les agents accumulaient jusqu'à 200 actions pendant une coupure réseau, et
autant de requêtes au retour de connexion saturaient le serveur pendant le
démontage. Un endpoint de lot ramène cela à une seule requête.

Closes #47
```

```
fix(mobile): conserve l'action en file après un échec réseau
```

```
refactor(api)!: renomme /items/scan en /items/:id/transitions

BREAKING CHANGE: les clients mobiles antérieurs à la version 1.3 doivent être
mis à jour avant le déploiement de cette version.
```

Ce format est **vérifié automatiquement** par le job `commit-convention`
([workflow](../.github/workflows/commit-convention.yml)) sur chaque commit
d'une Pull Request ainsi que sur son titre. Un message non conforme bloque la
fusion.

---

## 6. Règles de Pull Request

### Conditions de fusion

Une PR ne peut être fusionnée que si **toutes** ces conditions sont réunies :

1. La CI est verte — `CI Backend`, `CI Mobile`, `Sécurité`, `Convention de commit`
2. Au moins **une revue approuvée** par un Code Owner
3. Aucune conversation de revue non résolue
4. La branche est à jour avec sa base
5. La liste de contrôle du modèle de PR est cochée

### Mode de fusion

| Vers        | Mode                     | Pourquoi                                                                                 |
| ----------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `develop`   | **Squash and merge**     | Une fonctionnalité = un commit lisible dans `develop`, sans les « wip » ni les « oups »   |
| `main`      | **Merge commit** (`--no-ff`) | Conserve la trace explicite de la release ; le commit de fusion est le point de rollback |

### Ce qu'un relecteur doit vérifier

- Le changement fait **ce que la PR annonce**, et rien de plus.
- Les cas d'erreur sont traités, pas seulement le chemin nominal.
- Des tests couvrent le nouveau comportement.
- **Aucun secret** n'est introduit — c'est le point de contrôle le plus important.
- Le code respecte le découpage N-Tier : aucune logique métier dans un
  Controller, aucun accès Mongoose hors d'un Repository.

---

## 7. Branch Protection Rules à activer sur GitHub

> Ces réglages ne peuvent pas être versionnés : ils s'appliquent dans
> **Settings → Branches → Add branch protection rule**. Sans eux, toutes les
> règles ci-dessus ne sont que des recommandations.

### Sur `main`

| Réglage                                                | Valeur                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Require a pull request before merging                   | ✅                                                                    |
| ├─ Require approvals                                    | **1** minimum                                                        |
| ├─ Dismiss stale approvals when new commits are pushed  | ✅ (une approbation porte sur un contenu précis, pas sur une branche) |
| └─ Require review from Code Owners                      | ✅                                                                    |
| Require status checks to pass before merging            | ✅                                                                    |
| └─ Checks requis                                        | `Qualité de code (ESLint + Prettier)`, `Tests unitaires`, `Tests d'intégration (MongoDB replica set)`, `Tests (logique Offline-First)`, `Recherche de secrets commités`, `Vérifier les messages de commit` |
| Require branches to be up to date before merging        | ✅                                                                    |
| Require conversation resolution before merging          | ✅                                                                    |
| Require linear history                                  | ❌ (les merges `--no-ff` de release doivent rester possibles)          |
| Do not allow bypassing the above settings               | ✅ — **y compris pour les administrateurs**                            |
| Allow force pushes                                      | ❌                                                                    |
| Allow deletions                                         | ❌                                                                    |

### Sur `develop`

Mêmes réglages, à deux exceptions près :

- « Require review from Code Owners » peut être désactivé pour fluidifier
  l'intégration quotidienne ;
- « Require branches to be up to date » peut être désactivé si l'équipe
  fusionne beaucoup, pour éviter les rebases en chaîne.

### Vérification

```bash
# Doit échouer si la protection est correctement active :
git checkout main
git commit --allow-empty -m "test: verification de la protection de branche"
git push origin main
# → remote: error: GH006: Protected branch update failed
```

---

## 8. Erreurs fréquentes et comment s'en sortir

| Situation                                        | Correctif                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| Feature fusionnée par erreur sur `main`          | Back-merger `main` dans `develop` (Règle 3), puis rappeler la règle en revue |
| `develop` et `main` ont divergé                  | `git checkout develop && git merge --no-ff origin/main`                     |
| Commit avec un message non conforme, non poussé  | `git commit --amend -m "feat(api): message conforme"`                        |
| Message non conforme déjà poussé sur une feature | `git rebase -i` puis `git push --force-with-lease` (jamais `--force`)        |
| Branche partie de `main` au lieu de `develop`    | `git rebase --onto develop main ma-branche`                                  |
| Secret commité par mégarde                       | **Révoquer immédiatement le secret**, puis nettoyer l'historique — voir [SECURITY.md](SECURITY.md) |

---

## 9. Pourquoi Gitflow ici, et pas GitHub Flow ?

GitHub Flow (une seule branche permanente, déploiement continu depuis `main`)
est plus léger et convient très bien à un service web déployé dix fois par jour.

LogiChain n'est pas dans ce cas :

- l'application mobile est **distribuée par store**, avec un cycle de validation
  qui interdit de considérer la production comme un flux continu ;
- l'exploitation se fait pendant des **événements datés** (festivals) : on ne
  déploie pas en pleine phase de démontage, et il faut donc une branche stable
  figée pendant la manifestation, pendant que le développement continue ;
- le projet est **transmis à une seconde équipe**, pour qui un modèle explicite
  et documenté vaut mieux qu'une convention implicite.

`develop` fournit exactement ce tampon : les fonctionnalités continuent d'être
intégrées et testées en recette pendant que `main` reste figée sur la version
qui tourne sur le terrain.
