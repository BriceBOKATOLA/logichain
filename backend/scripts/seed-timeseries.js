/**
 * seed-logichain.js
 * ------------------------------------------------------------------
 * Script AUTONOME et ISOLÉ : n'importe aucun fichier de ton projet
 * (pas de dépendance à tes models/services existants), donc aucune
 * interférence possible avec le code déjà en place.
 *
 * Il se contente de :
 *   1) se connecter à MongoDB (MONGO_URI)
 *   2) créer la collection Time Series "monitorings" si absente
 *   3) insérer les documents events / items / monitoringLogs ci-dessous
 *
 * Usage :
 *   1. npm install mongodb        (si pas déjà présent)
 *   2. MONGO_URI="mongodb://127.0.0.1:27017/logichain" node seed-logichain.js
 *
 * Le script est idempotent-safe côté IDs : il utilise des ObjectId figés
 * (mêmes valeurs qu'à chaque exécution). Si tu relances le script deux fois,
 * les doublons sur _id seront simplement rejetés (erreur 11000) sans
 * dupliquer les données ni casser l'existant.
 * ------------------------------------------------------------------
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/logichain';

// IDs figés et réutilisés partout pour garder la cohérence des références.
const ids = {
  event1: new ObjectId('665f1a2b3c4d5e6f70810001'),
  event2: new ObjectId('665f1a2b3c4d5e6f70810002'),
  userAdmin: new ObjectId('665f1a2b3c4d5e6f70820001'),
  userAgent1: new ObjectId('665f1a2b3c4d5e6f70820002'),
  userAgent2: new ObjectId('665f1a2b3c4d5e6f70820003'),
  item1: new ObjectId('665f1a2b3c4d5e6f70840001'),
  item2: new ObjectId('665f1a2b3c4d5e6f70840002'),
  item3: new ObjectId('665f1a2b3c4d5e6f70840003'),
  item4: new ObjectId('665f1a2b3c4d5e6f70840004'),
};

const events = [
  {
    _id: ids.event1,
    name: 'Festival Les Ondes du Havre',
    description: 'Festival éco-responsable en plein air, 3 jours, zones montage/démontage sensibles.',
    startDate: new Date('2026-09-10T08:00:00.000Z'),
    endDate: new Date('2026-09-13T22:00:00.000Z'),
    status: 'setup',
    carbonBudgetKg: 5000,
    createdBy: ids.userAdmin,
    version: 2,
    zones: [
      {
        _id: new ObjectId('665f1a2b3c4d5e6f70830001'),
        name: 'Zone Scène principale',
        code: 'Z-SCENE',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0.1075, 49.4938],
              [0.109, 49.4938],
              [0.109, 49.4948],
              [0.1075, 49.4948],
              [0.1075, 49.4938],
            ],
          ],
        },
      },
      {
        _id: new ObjectId('665f1a2b3c4d5e6f70830002'),
        name: 'Zone Logistique / Backstage',
        code: 'Z-LOGI',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0.105, 49.493],
              [0.107, 49.493],
              [0.107, 49.4938],
              [0.105, 49.4938],
              [0.105, 49.493],
            ],
          ],
        },
      },
    ],
    createdAt: new Date('2026-08-01T09:12:00.000Z'),
    updatedAt: new Date('2026-08-25T14:03:00.000Z'),
  },
  {
    _id: ids.event2,
    name: 'Salon Pro Logistique Normandie',
    description: "Salon professionnel en salle, faible surface, forte densité d'items.",
    startDate: new Date('2026-10-02T08:00:00.000Z'),
    endDate: new Date('2026-10-03T18:00:00.000Z'),
    status: 'draft',
    carbonBudgetKg: 1200,
    createdBy: ids.userAdmin,
    version: 0,
    zones: [],
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  },
];

const items = [
  {
    _id: ids.item1,
    label: 'Groupe électrogène 45kVA #3',
    sku: 'GEN-45KVA-003',
    category: 'energy',
    event: ids.event1,
    zoneCode: 'Z-LOGI',
    status: 'in_transit',
    currentPosition: { type: 'Point', coordinates: [0.1062, 49.4934] },
    carbonFootprintKg: 4.16,
    assignedTo: ids.userAgent1,
    version: 3,
    history: [
      {
        action: 'created',
        byUser: ids.userAdmin,
        at: new Date('2026-08-20T09:00:00.000Z'),
        note: '',
        clientEventId: null,
      },
      {
        action: 'moved',
        byUser: ids.userAgent1,
        at: new Date('2026-08-24T07:32:00.000Z'),
        position: { type: 'Point', coordinates: [0.1058, 49.4931] },
        note: "Sorti de l'entrepôt",
        clientEventId: 'a1e4c2f0-11f2-4e2a-9b23-000000000001',
      },
      {
        action: 'moved',
        byUser: ids.userAgent1,
        at: new Date('2026-08-24T08:10:00.000Z'),
        position: { type: 'Point', coordinates: [0.1062, 49.4934] },
        note: 'En transit vers Z-SCENE',
        clientEventId: 'a1e4c2f0-11f2-4e2a-9b23-000000000002',
      },
    ],
    createdAt: new Date('2026-08-20T09:00:00.000Z'),
    updatedAt: new Date('2026-08-24T08:10:00.000Z'),
  },
  {
    _id: ids.item2,
    label: 'Barrière de sécurité type Vauban',
    sku: 'SAF-VAUBAN-014',
    category: 'safety',
    event: ids.event1,
    zoneCode: 'Z-SCENE',
    status: 'delivered',
    currentPosition: { type: 'Point', coordinates: [0.1082, 49.4943] },
    carbonFootprintKg: 0.27,
    assignedTo: ids.userAgent2,
    version: 2,
    history: [
      { action: 'created', byUser: ids.userAdmin, at: new Date('2026-08-21T09:00:00.000Z') },
      {
        action: 'delivered',
        byUser: ids.userAgent2,
        at: new Date('2026-08-24T09:45:00.000Z'),
        position: { type: 'Point', coordinates: [0.1082, 49.4943] },
        note: 'Installée en périmètre scène',
        clientEventId: 'b2f5d3a1-22a3-4f3b-8c34-000000000001',
      },
    ],
    createdAt: new Date('2026-08-21T09:00:00.000Z'),
    updatedAt: new Date('2026-08-24T09:45:00.000Z'),
  },
  {
    _id: ids.item3,
    label: 'Structure scénique modulaire (pied de scène)',
    sku: 'STRUCT-SCENE-001',
    category: 'structure',
    event: ids.event1,
    zoneCode: 'Z-SCENE',
    status: 'anomaly',
    currentPosition: { type: 'Point', coordinates: [0.108, 49.4941] },
    carbonFootprintKg: 6.3,
    assignedTo: ids.userAgent2,
    version: 4,
    history: [
      { action: 'created', byUser: ids.userAdmin, at: new Date('2026-08-19T09:00:00.000Z') },
      {
        action: 'anomaly',
        byUser: ids.userAgent2,
        at: new Date('2026-08-25T11:20:00.000Z'),
        position: { type: 'Point', coordinates: [0.108, 49.4941] },
        note: 'Fissure détectée sur un pied de structure, à inspecter en urgence',
        clientEventId: 'c3a6e4b2-33b4-4a4c-9d45-000000000001',
      },
    ],
    createdAt: new Date('2026-08-19T09:00:00.000Z'),
    updatedAt: new Date('2026-08-25T11:20:00.000Z'),
  },
  {
    _id: ids.item4,
    label: 'Lot de panneaux de signalétique',
    sku: 'SIGN-PACK-021',
    category: 'signage',
    event: ids.event1,
    zoneCode: 'Z-LOGI',
    status: 'in_stock',
    currentPosition: { type: 'Point', coordinates: [0.1055, 49.4932] },
    carbonFootprintKg: 0,
    assignedTo: null,
    version: 0,
    history: [{ action: 'created', byUser: ids.userAdmin, at: new Date('2026-08-22T09:00:00.000Z') }],
    createdAt: new Date('2026-08-22T09:00:00.000Z'),
    updatedAt: new Date('2026-08-22T09:00:00.000Z'),
  },
];

const monitoringLogs = [
  {
    timestamp: new Date('2026-08-27T08:00:00.000Z'),
    metadata: { event: ids.event1, metric: 'scan_rate', zoneCode: 'Z-LOGI' },
    value: 42,
  },
  {
    timestamp: new Date('2026-08-27T08:05:00.000Z'),
    metadata: { event: ids.event1, metric: 'scan_rate', zoneCode: 'Z-LOGI' },
    value: 57,
  },
  {
    timestamp: new Date('2026-08-27T08:00:00.000Z'),
    metadata: { event: ids.event1, metric: 'carbon_footprint', zoneCode: null },
    value: 10.73,
  },
  {
    timestamp: new Date('2026-08-27T08:10:00.000Z'),
    metadata: { event: ids.event1, metric: 'sync_latency_ms', zoneCode: null },
    value: 340,
  },
  {
    timestamp: new Date('2026-08-27T08:10:00.000Z'),
    metadata: { event: ids.event1, metric: 'active_agents', zoneCode: null },
    value: 6,
  },
  {
    timestamp: new Date('2026-08-25T11:20:00.000Z'),
    metadata: { event: ids.event1, metric: 'bottleneck', zoneCode: 'Z-SCENE' },
    value: 1,
  },
];

async function insertMany(db, collectionName, docs) {
  if (!docs.length) return;
  try {
    const result = await db.collection(collectionName).insertMany(docs, { ordered: false });
    console.log(`✔ ${collectionName} : ${result.insertedCount} document(s) inséré(s)`);
  } catch (err) {
    if (err.code === 11000 || (err.writeErrors && err.writeErrors.every((e) => e.code === 11000))) {
      const inserted = err.result?.result?.nInserted ?? 0;
      console.log(
        `⚠ ${collectionName} : certains documents existaient déjà (doublons ignorés), ${inserted} inséré(s)`,
      );
    } else {
      throw err;
    }
  }
}

async function ensureTimeSeriesCollection(db) {
  const existing = await db.listCollections({ name: 'monitorings' }).toArray();
  if (existing.length > 0) return;

  await db.createCollection('monitorings', {
    timeseries: { timeField: 'timestamp', metaField: 'metadata', granularity: 'seconds' },
    expireAfterSeconds: 60 * 60 * 24 * 90,
  });
  console.log('✔ Collection Time Series "monitorings" créée');
}

async function main() {
  console.log(`Connexion à ${MONGO_URI} ...`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(); // utilise la base indiquée dans l'URI

  try {
    await ensureTimeSeriesCollection(db);
    await insertMany(db, 'events', events);
    await insertMany(db, 'items', items);
    await insertMany(db, 'monitorings', monitoringLogs);
    console.log('\n✅ Insertion terminée sans toucher au reste de la base.');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Erreur pendant le seed :', err.message);
  process.exit(1);
});
