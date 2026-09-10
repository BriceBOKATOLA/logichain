# QR Codes de démonstration

Ces fiches correspondent exactement aux 3 items créés par `scripts/seed.js` :

| Fichier | Contenu du QR | Matériel |
|---|---|---|
| `QR-0001.png` | `QR-0001` | Groupe électrogène 40kVA |
| `QR-0002.png` | `QR-0002` | Barrière Vauban x10 |
| `QR-0003.png` | `QR-0003` | Structure scène modulaire |
| `planche-a-imprimer.png` | — | Les 3 fiches sur une seule page, prête à imprimer |

Elles ont été générées et **vérifiées décodables** (contenu relu et confirmé égal au
code attendu). Pour tester le scan dans l'app mobile sans matériel physique :
ouvre `planche-a-imprimer.png` (ou un `QR-000X.png`) sur un écran ou imprime-le,
et vise-le avec `ScanScreen`.

## Régénérer des QR codes pour de nouveaux items

Dès qu'un administrateur crée de nouveaux items via l'API (`POST /events/:eventId/items`),
génère leurs fiches QR avec :

```bash
cd backend
npm install         # installe la dépendance qrcode si pas déjà fait
node scripts/generate-qrcodes.js            # événement actif le plus récent
node scripts/generate-qrcodes.js <eventId>  # ou un événement précis
```

Chaque item obtient un fichier `assets/qrcodes/<qrCode>.png`, avec un niveau de
correction d'erreur M (bon compromis lisibilité / résistance aux salissures et à
la lumière rasante, adapté à une utilisation sur du matériel de festival en extérieur).
