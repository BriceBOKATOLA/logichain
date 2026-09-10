/**
 * Convention de commit du projet LogiChain — Conventional Commits.
 *
 * Format imposé :  <type>(<portée>): <description>
 * Exemples        :  feat(api): ajoute la route de synchronisation par lot
 *                    fix(mobile): corrige le rollback après un conflit 409
 *                    ci(backend): active la couverture de code
 *
 * Cette convention n'est pas cosmétique : elle rend l'historique lisible en
 * revue, permet de générer un journal des versions et de déduire la portée
 * d'une régression sans ouvrir chaque diff.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nouvelle fonctionnalité
        'fix', // correction de bogue
        'docs', // documentation seule
        'style', // formatage, sans changement de comportement
        'refactor', // réécriture sans ajout ni correction
        'perf', // amélioration de performance
        'test', // ajout ou correction de tests
        'build', // système de build, dépendances
        'ci', // pipelines d'intégration continue
        'chore', // tâches diverses (outillage, nettoyage)
        'revert', // annulation d'un commit
      ],
    ],
    // Portées attendues : elles reflètent la structure du mono-repo.
    'scope-enum': [
      1,
      'always',
      ['api', 'backend', 'mobile', 'frontend', 'infra', 'ansible', 'ci', 'docs', 'deps', 'repo'],
    ],
    'subject-case': [0], // les descriptions sont en français, la casse est libre
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0], // les corps de commit détaillés sont encouragés
  },
};
