require('../src/config/env'); // valide et charge les variables d'environnement
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../src/config/database');
const Item = require('../src/models/schemas/item.schema');
const Event = require('../src/models/schemas/event.schema');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'qrcodes');

/**
 * generate-qrcodes.js — Génère une image QR code (PNG) par item d'un événement,
 * prête à être imprimée et collée sur le matériel physique pour le scan terrain.
 *
 * Usage :
 *   node scripts/generate-qrcodes.js                 -> événement actif le plus récent
 *   node scripts/generate-qrcodes.js <eventId>        -> événement précis
 */
async function main() {
  await db.connect();

  const eventId = process.argv[2];
  const event = eventId
    ? await Event.findById(eventId)
    : (await Event.find({ status: 'active' }).sort({ startDate: -1 }))[0];

  if (!event) {
    console.error("Aucun événement trouvé (ni actif, ni par l'ID fourni).");
    process.exit(1);
  }

  const items = await Item.find({ eventId: event._id }).sort({ qrCode: 1 });
  if (items.length === 0) {
    console.log(`Aucun item pour l'événement "${event.name}". Rien à générer.`);
    await db.disconnect();
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const item of items) {
    const filePath = path.join(OUT_DIR, `${item.qrCode}.png`);
    // Niveau de correction d'erreur M : bon compromis lisibilité / résistance
    // aux salissures et à la lumière rasante, fréquentes sur du matériel de festival.
    await QRCode.toFile(filePath, item.qrCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
    });
    console.log(`Généré : ${filePath}  (${item.label})`);
  }

  console.log(`\n${items.length} fiche(s) QR générée(s) dans ${OUT_DIR}`);
  await db.disconnect();
}

main().catch((err) => {
  console.error('Échec de la génération des QR codes :', err.message);
  process.exit(1);
});
