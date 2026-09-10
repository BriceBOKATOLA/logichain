# ADR-001 — Mono-repo plutôt que dépôts séparés

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : équipe DevOps LogiChain
- **Exigence couverte** : §4.1 « Structure de repositories : organisation propre
  des sous-projets (mono-repo ou multi-repos **argumentés**) »

---

## Contexte

La plateforme LogiChain se compose de trois ensembles techniquement distincts :

1. **`backend/`** — API Node.js/Express, architecture N-Tier, MongoDB.
2. **`frontend/`** — application mobile React Native (Expo), Offline-First.
3. **`infra/`** — Infrastructure as Code Ansible provisionnant le serveur.

Le projet entre en phase d'industrialisation et de **transmission à une seconde
équipe**. Il faut arbitrer entre un dépôt unique et trois dépôts séparés.

L'état de départ n'était ni l'un ni l'autre : un `package.json` et un
`node_modules` traînaient à la racine avec des dépendances React Native, ce qui
faisait cohabiter deux copies de `react-native-maps` (1.18.0 à la racine,
1.20.1 dans `frontend/`) — un piège de résolution de module en attente.

---

## Décision

**Un mono-repo unique**, `BriceBOKATOLA/logichain`, avec une séparation stricte
des sous-projets :

- chaque sous-projet possède son propre `package.json`, son propre
  `package-lock.json`, sa propre configuration ESLint, Prettier et Jest ;
- le `package.json` racine ne déclare **aucune dépendance** : c'est un simple
  manifeste d'orchestration qui délègue via `npm --prefix` ;
- aucun code n'est partagé entre `backend/` et `frontend/`, et aucun import ne
  traverse la frontière.

---

## Justification

### Ce qui a fait pencher la balance

**1. Un déploiement met en jeu les trois composants à la fois.**
Ajouter une route à l'API implique souvent de modifier l'appel côté mobile et,
parfois, d'ajouter une variable d'environnement dans le template Ansible. En
multi-repos, ce changement se scinde en trois Pull Requests dans trois dépôts,
sans moyen de les fusionner atomiquement. Il existe alors nécessairement un
instant où le mobile appelle une route qui n'existe pas encore, ou bien où la
production tourne avec une variable manquante. Le mono-repo rend ce changement
**atomique et relisible d'un seul tenant**.

**2. L'équipe est petite et le projet est transmis.**
Le multi-repos se justifie quand des équipes distinctes ont des cycles de
livraison indépendants. Ce n'est pas le cas ici : la même équipe touche aux
trois ensembles, souvent le même jour. Multiplier les dépôts multiplierait les
droits d'accès, les règles de protection, les configurations CI et les README à
maintenir — pour une seule et même équipe.

**3. La reproductibilité intégrale est plus simple à garantir.**
Le §5 exige que le serveur soit reconstructible « en une seule commande depuis
une machine vierge ». Avec un mono-repo, le playbook Ansible clone **un** dépôt
à **une** révision et dispose de tout ce dont il a besoin. En multi-repos, il
faudrait synchroniser plusieurs révisions et gérer leur cohérence mutuelle —
exactement le genre de complexité qui finit par produire un déploiement
partiellement à jour.

**4. Un historique unique répond aux questions d'incident.**
« Quel état exact du système tournait le 12 mars ? » se répond avec un seul
`git log` et un seul tag, plutôt qu'en recoupant trois historiques.

### Ce que l'on abandonne, en conscience

| Inconvénient                                             | Comment il est traité                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Clone plus volumineux                                    | 0,9 Mo hors dépendances — négligeable                                                  |
| La CI risque de tout exécuter à chaque changement        | Deux pipelines séparés (`CI Backend`, `CI Mobile`), avec cache npm par sous-projet     |
| Droits d'accès moins granulaires                          | `CODEOWNERS` par répertoire, avec revue obligatoire sur `infra/` et `.github/`         |
| Les numéros de version des sous-projets se confondent    | Les tags portent la version de la **plateforme** ; les versions de sous-projets restent internes |
| Risque de couplage involontaire entre back et front       | Aucun import ne traverse la frontière ; aucune dépendance à la racine ; vérifiable d'un coup d'œil |

---

## Alternatives étudiées

### A. Trois dépôts séparés (`logichain-backend`, `logichain-mobile`, `logichain-infra`)

**Rejeté.** Convient à des équipes autonomes avec des cycles de livraison
découplés. Ici, cela produirait des Pull Requests croisées pour un changement
unique, une coordination manuelle des révisions au déploiement, et trois fois
la même configuration CI à maintenir — sans bénéfice réel.

### B. Mono-repo avec npm workspaces

**Rejeté.** Les workspaces hissent les dépendances dans un `node_modules`
racine partagé. Or Metro, le bundler de React Native, se comporte mal avec les
dépendances hissées, et surtout : le déploiement de production ne doit installer
**que** les dépendances du backend. Un `node_modules` partagé y ferait entrer
React Native et tout l'écosystème Expo sur le serveur — plusieurs centaines de
mégaoctets inutiles, et autant de surface d'attaque supplémentaire.

L'installation reste donc délibérément **séparée par sous-projet**.

### C. Statu quo (racine polluée)

**Rejeté.** C'est l'état initial : un `package.json` racine contenant des
dépendances React Native, un `node_modules` racine dupliquant
`react-native-maps` dans une version différente de celle du frontend. Ni
mono-repo assumé ni multi-repos — juste une ambiguïté qui aurait fini par
produire un bogue de résolution de module difficile à diagnostiquer.

---

## Conséquences

### Positives

- Un changement transverse tient dans une seule Pull Request, relue d'un bloc.
- Le playbook Ansible clone un seul dépôt à une seule révision.
- Une seule configuration de branches, de protections et de CODEOWNERS.
- La racine du dépôt est propre : plus aucune dépendance parasite.

### Négatives, et leur atténuation

- **La CI tourne sur les deux sous-projets à chaque Pull Request.** C'est
  assumé : filtrer par `paths` empêcherait les *status checks* requis de se
  déclencher, ce qui bloquerait indéfiniment les Pull Requests soumises aux
  Branch Protection Rules. Le cache npm ramène le surcoût à quelques dizaines
  de secondes.
- **Vigilance nécessaire sur la frontière back/front.** À contrôler en revue :
  aucun import ne doit traverser, et la racine doit rester sans dépendance.

### Si cette décision devait être révisée

Le passage au multi-repos se justifierait si l'une de ces conditions apparaît :

1. une équipe mobile distincte, avec son propre cycle de livraison ;
2. l'ouverture du backend à d'autres clients que l'application LogiChain ;
3. une durée de CI devenue pénalisante malgré le cache.

`git filter-repo --path backend/` permettrait alors d'extraire un sous-projet
**en conservant son historique**. La séparation stricte décrite ici est
justement ce qui rendra cette extraction possible sans douleur.
