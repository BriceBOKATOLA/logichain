require('../src/config/env'); // valide et charge les variables d'environnement
const bcrypt = require('bcryptjs');
const db = require('../src/config/database');
const Event = require('../src/models/schemas/event.schema');
const Item = require('../src/models/schemas/item.schema');
const User = require('../src/models/schemas/user.schema');

/**
 * Script de peuplement de démonstration : un événement, une zone, un admin,
 * un agent de terrain, et quelques items en stock.
 */
async function seed() {
  await db.connect();

  await Promise.all([Event.deleteMany({}), Item.deleteMany({}), User.deleteMany({})]);

  const admin = await User.create({
    email: 'admin@logichain.io',
    passwordHash: await bcrypt.hash('Admin1234!', 12),
    fullName: 'Admin LogiChain',
    role: 'admin',
  });

  const agent = await User.create({
    email: 'agent@logichain.io',
    passwordHash: await bcrypt.hash('Agent1234!', 12),
    fullName: 'Agent Terrain',
    role: 'field_agent',
  });

  const transporter = await User.create({
    email: 'transporteur@logichain.io',
    passwordHash: await bcrypt.hash('Transp1234!', 12),
    fullName: 'Transporteur Demo',
    role: 'transporter',
  });

  const event = await Event.create({
    name: 'Festival Eco-Responsable 2026',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-04'),
    status: 'active',
    zones: [
      {
        name: 'Zone Scène Principale',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2.35, 48.85],
              [2.36, 48.85],
              [2.36, 48.86],
              [2.35, 48.86],
              [2.35, 48.85],
            ],
          ],
        },
      },
    ],
  });

  await Item.insertMany([
    {
      label: 'Groupe électrogène 40kVA',
      qrCode: 'QR-0001',
      eventId: event._id,
      carbonWeightKg: 800,
      transportMode: 'road',
    },
    {
      label: 'Barrière Vauban x10',
      qrCode: 'QR-0002',
      eventId: event._id,
      carbonWeightKg: 350,
      transportMode: 'electric_vehicle',
    },
    {
      label: 'Structure scène modulaire',
      qrCode: 'QR-0003',
      eventId: event._id,
      carbonWeightKg: 2200,
      transportMode: 'rail',
    },
  ]);

  console.log('Seed terminé:');
  console.log({
    admin: admin.email,
    agent: agent.email,
    transporter: transporter.email,
    eventId: event._id.toString(),
  });
  await db.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
