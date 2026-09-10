/**
 * ScannerService — Normalise la sortie de la librairie de scan caméra (QR/Code-barres)
 * et fournit un retour haptique/sonore, afin que l'agent puisse valider "sans regarder l'écran"
 * (exigence "Module de scan industriel").
 */
import { Vibration } from 'react-native';

class ScannerService {
  onCodeScanned(rawValue) {
    Vibration.vibrate(80); // retour haptique court, non intrusif
    return rawValue?.trim();
  }

  vibrateError() {
    Vibration.vibrate([0, 60, 60, 60]);
  }
}

export default new ScannerService();
