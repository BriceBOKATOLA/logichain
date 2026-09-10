/**
 * ScannerService — Normalise la sortie de la librairie de scan caméra (QR/Code-barres)
 * et fournit un retour haptique ET sonore, afin que l'agent puisse valider "sans regarder l'écran"
 * (exigence "Module de scan industriel").
 */
import { Vibration } from 'react-native';
import soundService from './SoundService';

class ScannerService {
  onCodeScanned(rawValue) {
    Vibration.vibrate(80); // retour haptique court, non intrusif
    // Volontairement non attendu (`void`, pas de await) : un bip qui met du
    // temps à se charger la toute première fois ne doit jamais retarder la
    // suite du traitement du scan, qui est ce qui compte réellement.
    void soundService.playScanBeep();
    return rawValue?.trim();
  }

  vibrateError() {
    Vibration.vibrate([0, 60, 60, 60]);
  }
}

export default new ScannerService();
