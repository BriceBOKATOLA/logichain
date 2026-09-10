# Description

<!-- Que fait cette PR, et surtout POURQUOI ? Le « quoi » se lit dans le diff,
     le « pourquoi » ne se lit nulle part ailleurs. -->

## Type de changement

- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bogue
- [ ] `refactor` — réécriture sans changement de comportement
- [ ] `docs` — documentation
- [ ] `ci` / `build` — outillage, pipelines, dépendances
- [ ] `infra` — Ansible, serveur, déploiement

## Portée

- [ ] `backend` (API Node.js)
- [ ] `frontend` (application mobile)
- [ ] `infra` (Ansible / CI-CD)
- [ ] `docs`

## Ticket lié

<!-- Closes #123 -->

---

## Liste de contrôle avant demande de revue

### Général

- [ ] La branche part de `develop` et s'appelle `feature/…`, `fix/…` ou `hotfix/…`
- [ ] Les messages de commit respectent les [Conventional Commits](../commitlint.config.js)
- [ ] **Aucun secret** (`.env`, clé, mot de passe, token) n'est ajouté au dépôt
- [ ] La documentation touchée est à jour (README, RUNBOOK, GITFLOW)

### Backend

- [ ] `npm run lint` passe sans erreur ni avertissement
- [ ] `npm test` passe (unitaires **et** intégration)
- [ ] Les nouveaux comportements sont couverts par des tests
- [ ] Toute nouvelle variable d'environnement est déclarée dans `src/config/env.js`,
      `.env.example` **et** le template Ansible `env.j2`

### Frontend

- [ ] `npm run lint` et `npm test` passent
- [ ] Testé sur un appareil ou un émulateur réel
- [ ] Le comportement hors-ligne a été vérifié (mode avion)

### Infrastructure

- [ ] `ansible-lint` passe
- [ ] Le playbook a été exécuté **deux fois** de suite : le second passage ne
      signale aucun `changed` (preuve d'idempotence, §5 du cahier des charges)
- [ ] Aucune commande `shell`/`command` sans garde `creates:` ou `when:`
- [ ] Le Runbook est à jour si la procédure d'exploitation change

---

## Comment vérifier ce changement

<!-- Étapes concrètes permettant au relecteur de reproduire le résultat. -->

1.
2.
3.

## Impact sur la production

- [ ] Aucun — changement purement interne
- [ ] Nécessite une migration de données (procédure décrite ci-dessous)
- [ ] Nécessite une nouvelle variable d'environnement (ajoutée au Vault)
- [ ] Nécessite une intervention manuelle sur le serveur (décrite ci-dessous)
