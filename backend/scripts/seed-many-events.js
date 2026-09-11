require('../src/config/env'); // valide et charge les variables d'environnement
const db = require('../src/config/database');
const Event = require('../src/models/schemas/event.schema');
const Item = require('../src/models/schemas/item.schema');

/**
 * seed-many-events.js — Peuple la base avec un ensemble varié d'événements,
 * pour donner au tableau de bord web de supervision (multi-événements) une
 * vue réaliste. Contrairement à scripts/seed.js, ce script est ADDITIF : il
 * ne vide AUCUNE collection existante, et peut être relancé sans dupliquer
 * si on le souhaite (il vérifie l'existence par nom avant de créer).
 */
const TRANSPORT_MODES = ['road', 'rail', 'electric_vehicle', 'foot'];
const ITEM_LABELS = [
  'Groupe électrogène 60kVA',
  'Barrière Vauban x20',
  'Structure scène modulaire',
  'Sonorisation Line Array',
  'Éclairage LED batterie',
  'Tente de réception 100m²',
  'Chapiteau traiteur',
  'Groupe froid mobile',
];

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function makeZone(name, [lng, lat]) {
  const d = 0.006;
  return {
    name,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lng - d, lat - d],
          [lng + d, lat - d],
          [lng + d, lat + d],
          [lng - d, lat + d],
          [lng - d, lat - d],
        ],
      ],
    },
  };
}

// Point aléatoire à l'intérieur (large) du centre d'une zone, pour que la
// carte du tableau de bord affiche des marqueurs dispersés de façon réaliste
// plutôt que tous superposés au même pixel.
function randomPointNear([lng, lat]) {
  const jitter = () => (Math.random() - 0.5) * 0.008;
  return { type: 'Point', coordinates: [lng + jitter(), lat + jitter()] };
}

// Centre géographique d'un événement : moyenne de la boîte englobante de sa
// première zone, ou un point par défaut (Paris) si l'événement n'a aucune
// zone définie — un item doit toujours avoir une position exploitable.
const DEFAULT_CENTER = [2.3522, 48.8566];
function eventCenter(event) {
  const zone = event.zones && event.zones[0];
  if (!zone) return DEFAULT_CENTER;
  const ring = zone.geometry.coordinates[0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

const EVENTS = [
  {
    name: 'Salon Tech Innovation 2026',
    startDate: daysFromNow(-30),
    endDate: daysFromNow(-27),
    status: 'closed',
    zones: [makeZone('Hall principal', [2.37, 48.83])],
  },
  {
    name: 'Marathon Solidaire de Printemps',
    startDate: daysFromNow(-14),
    endDate: daysFromNow(-14),
    status: 'closed',
    zones: [makeZone('Ligne de départ', [2.34, 48.87]), makeZone("Zone d'arrivée", [2.36, 48.86])],
  },
  {
    name: 'Convention Gaming Expo',
    startDate: daysFromNow(-3),
    endDate: daysFromNow(1),
    status: 'active',
    zones: [makeZone('Zone exposants', [2.29, 48.85]), makeZone('Zone conférences', [2.3, 48.85])],
  },
  {
    name: 'Festival Musiques du Monde',
    startDate: daysFromNow(0),
    endDate: daysFromNow(3),
    status: 'active',
    zones: [makeZone('Grande scène', [2.35, 48.85]), makeZone('Village associatif', [2.35, 48.86])],
  },
  {
    name: 'Foire Agricole Régionale',
    startDate: daysFromNow(7),
    endDate: daysFromNow(10),
    status: 'draft',
    zones: [makeZone('Halls animaux', [2.4, 48.8])],
  },
  {
    name: 'Congrès Médical Annuel',
    startDate: daysFromNow(15),
    endDate: daysFromNow(17),
    status: 'draft',
    zones: [],
  },
  {
    name: 'Tournoi Sportif Interentreprises',
    startDate: daysFromNow(21),
    endDate: daysFromNow(22),
    status: 'draft',
    zones: [makeZone('Terrain central', [2.32, 48.88])],
  },
  {
    name: 'Salon du Livre Jeunesse',
    startDate: daysFromNow(28),
    endDate: daysFromNow(30),
    status: 'draft',
    zones: [makeZone('Espace lecture', [2.33, 48.84])],
  },
  {
    name: 'Fête de la Musique — Édition Locale',
    startDate: daysFromNow(-60),
    endDate: daysFromNow(-60),
    status: 'closed',
    zones: [makeZone('Place centrale', [2.35, 48.85])],
  },
  {
    name: 'Exposition Art Contemporain',
    startDate: daysFromNow(-7),
    endDate: daysFromNow(-1),
    status: 'closed',
    zones: [makeZone('Galerie principale', [2.31, 48.86])],
  },
  {
    name: 'Rassemblement Associatif Régional',
    startDate: daysFromNow(35),
    endDate: daysFromNow(36),
    status: 'draft',
    zones: [makeZone('Chapiteau A', [2.38, 48.82])],
  },
  {
    name: 'Village de Noël Éco-Responsable',
    startDate: daysFromNow(90),
    endDate: daysFromNow(97),
    status: 'draft',
    zones: [makeZone('Marché', [2.35, 48.85]), makeZone('Patinoire', [2.35, 48.851])],
  },
];

async function seed() {
  await db.connect();

  let created = 0;
  let skipped = 0;

  for (const def of EVENTS) {
    const exists = await Event.findOne({ name: def.name });
    if (exists) {
      skipped += 1;
      continue;
    }

    const event = await Event.create(def);
    created += 1;

    // 4 à 10 items par événement, pour que le tableau de bord de supervision
    // (liste d'items + carte) affiche des répartitions et des positions
    // variées et réalistes plutôt que des écrans presque vides.
    const itemCount = 4 + Math.floor(Math.random() * 7);
    const states = ['in_stock', 'in_transit', 'delivered', 'in_maintenance'];
    const center = eventCenter(event);
    const items = Array.from({ length: itemCount }).map((_, i) => ({
      label: ITEM_LABELS[Math.floor(Math.random() * ITEM_LABELS.length)],
      qrCode: `QR-${event._id.toString().slice(-6)}-${i}`,
      eventId: event._id,
      state: def.status === 'draft' ? 'in_stock' : states[Math.floor(Math.random() * states.length)],
      carbonWeightKg: 50 + Math.floor(Math.random() * 2000),
      transportMode: TRANSPORT_MODES[Math.floor(Math.random() * TRANSPORT_MODES.length)],
      location: randomPointNear(center),
    }));
    await Item.insertMany(items);
  }

  console.log(`Terminé : ${created} événement(s) créé(s), ${skipped} déjà présent(s) (ignoré(s)).`);
  await db.disconnect();
}

seed().catch(async (err) => {
  console.error('Échec du seed :', err.message);
  await db.disconnect().catch(() => {});
  process.exit(1);
});
