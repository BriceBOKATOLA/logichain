require('../src/config/env'); // valide et charge les variables d'environnement
const mongoose = require('mongoose');
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

// Les modèles doivent être chargés pour que Mongoose connaisse leurs index.
require('../src/models/schemas/user.schema');
require('../src/models/schemas/event.schema');
require('../src/models/schemas/item.schema');
require('../src/models/schemas/route.schema');

/**
 * ensure-indexes.js — Création explicite des index déclarés dans les schémas.
 *
 * En production `autoIndex` est désactivé (cf. src/config/database.js) : ce script
 * est le point d'entrée unique de l'« indexation initiale » exigée par le rôle
 * Ansible `database`. `Model.syncIndexes()` est idempotent — il crée les index
 * manquants, supprime ceux qui ne sont plus déclarés, et ne fait rien si l'état
 * est déjà conforme. Le playbook peut donc l'exécuter à chaque déploiement.
 */
/**
 * La collection de monitoring est une collection Time Series : elle ne peut pas
 * être créée implicitement avec les bonnes options par une simple écriture
 * Mongoose sur une base neuve. On la provisionne explicitement, en ignorant
 * l'erreur 48 (NamespaceExists) pour rester idempotent.
 */
async function ensureTimeSeriesCollection() {
  const { db: native } = mongoose.connection;
  try {
    await native.createCollection('monitorings', {
      timeseries: { timeField: 'timestamp', metaField: 'eventId', granularity: 'seconds' },
    });
    logger.info('[indexes] Collection Time Series "monitorings" créée.');
  } catch (err) {
    if (err.codeName !== 'NamespaceExists' && err.code !== 48) throw err;
    logger.info('[indexes] Collection Time Series "monitorings" déjà présente.');
  }
}

async function main() {
  await db.connect();
  await ensureTimeSeriesCollection();

  const results = [];
  for (const [name, model] of Object.entries(mongoose.models)) {
    // syncIndexes() renvoie la liste des index supprimés ; les créations sont implicites.
    const dropped = await model.syncIndexes();
    const indexes = await model.collection.indexes();
    results.push({ model: name, indexes: indexes.map((i) => i.name), dropped });
  }

  for (const r of results) {
    logger.info(`[indexes] ${r.model}: ${r.indexes.join(', ')}`);
    console.log(`${r.model.padEnd(12)} -> ${r.indexes.join(', ')}`);
  }

  await db.disconnect();
}

main().catch(async (err) => {
  console.error('Échec de la synchronisation des index :', err.message);
  await db.disconnect().catch(() => {});
  process.exit(1);
});
