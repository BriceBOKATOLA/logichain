const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * setup-db.js — Cycle de vie de la base de test pour les suites d'intégration.
 *
 * On démarre un REPLICA SET en mémoire (et non un mongod standalone) car
 * `DatabaseConnection.withTransaction()` s'appuie sur les transactions ACID
 * multi-documents, indisponibles hors replica set. Le pipeline CI reproduit
 * ainsi exactement la topologie de production décrite dans docker-compose.yml.
 */
let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
});

/**
 * Isolation stricte entre tests : chaque `it` part d'une base vide, ce qui rend
 * les suites indépendantes de leur ordre d'exécution.
 *
 * Deux familles de collections sont écartées du nettoyage :
 *  - les collections système (`system.views`, `system.buckets.*`), que MongoDB
 *    crée lui-même pour matérialiser les collections Time Series et sur
 *    lesquelles toute écriture est refusée ;
 *  - la collection Time Series `monitorings` elle-même : MongoDB n'y autorise
 *    pas un `deleteMany({})` sans filtre. C'est un journal de métriques en
 *    ajout seul, sur lequel aucune assertion inter-tests ne porte.
 */
afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;

  const infos = await mongoose.connection.db.listCollections().toArray();
  const cleanable = infos.filter((i) => !i.name.startsWith('system.') && i.type !== 'timeseries');

  await Promise.all(cleanable.map((i) => mongoose.connection.db.collection(i.name).deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});
