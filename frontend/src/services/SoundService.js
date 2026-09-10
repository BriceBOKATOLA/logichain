import { Audio } from 'expo-av';

/**
 * Bip de confirmation embarqué (WAV 8 bits / 8 kHz, ~1,3 Ko encodé en base64).
 * Généré directement plutôt qu'ajouté comme fichier binaire versionné : un son
 * aussi court n'a pas besoin d'un asset séparé, et ça évite un fichier .wav
 * dans le dépôt pour un bruit d'une fraction de seconde.
 */
const BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRuQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcADAACA5/mnNQA1p/jmgBkHWMr+ylkIGn/l96Y2Ajam9uSAGwlZyfzIWQobf+T1pjcEN6b1438cC1rH+sdaCx1/4vOlOAY4pfPhfx4NWsb4xloNHn/h8qU5CDmk8eCAHw5bxfbFWw8ggN/wpDoKOqTv3oAhEFvE9MRbESF/3u6jOww7o+3dgCISXMPyw1wSI4Dc7KM8DT2j7NuAJBRcwvHCXRQkf9vqoj4PPqLq2oAlFV3B78FdFiZ/2emiPxE/oujYgCcXXsDtwF4YJ4DY56FAE0Ch5teAKBlev+u/Xhopf9bloEEVQaDl1YAqG1++6b5fGyp/1eOgQhdCoOPUgCsdX73nvF8dLH/T4p9DGUOf4dKALR5gu+W7YB8tgNLgn0QaRJ/f0YAuIGG65LphIS9/0N6eRRxFnt7PfzAiYbniuWEiMH/P3J5GHkae3M6AMSRiuOC4YiQyf83bnUcgR53azH8zJWK33rdiJjN/y9mcSCJJnNjLgDQnY7bctmMoNX/K15xKJEqc1smANiljtdq1ZCk2gMjVm0smS5vVyIA3K2S02LRkKzh/x9ObTChMm9PGgDksZbPXs2UtOX/F0ppNKU2a0cWAOi5lstWyZS87f8TQmk4rTpnPw4A8MGax07BmMTx/ws6ZTy1Pmc7Cfz0yZq/Rr2YyPn/BzJhQL1CYzMCAPzRnrs+uZzQ/f7/LmFExUZjKv4BANWetza1oNkF/vsmXUjNSl8i9gEI3aKzLrGg4QoC8x5dTNVOXx7yAQzlpq8qraTlEf7vFllQ2VZbFuoBFO2mqyKppO0V/ucSWVjhWlcO5gEY8aqnGqWo9R4C4wpVXOleVwbd/SD5qqMSoaj9If7bAlFg8WJS/toBJQGunwqdrQEp/tb6UWT5ZlL60gEtCa6bApmxCS3+zvJNaQFqTvLN/TENspb6kbERNgLK7k1tCW5O6sYBORW2jvaNtRk5/sLmSXENckriwgE9HbaK7om1HUH+vt5JdRV2Rt66AUUluobmhbklRf621kV5HXpG1rYBSSm6gt6BuS1N/rLSQX0lgkLOrgFRMb5+1n29NVICqspBgS2GQsaqAVU5vnrOecE9Wf6mwj2JNYo+wqIBXUHCdsZ1wUFd/p66PY09jj66ngFhScZywnHFSWX+mrY5kUGSOrKV/WlNxm66bcVRaf6SrjmVSZY2qpIBbVXKarJlyVlx/o6mNZlRmjaiif11XcpiqmHJXXX+hp4xnVmeMp6GAXllzl6iXc1lff6CljGhYaIyln4BgWnOWppZ0W2A=';

/**
 * SoundService — Retour sonore court à chaque scan valide, complémentaire du
 * retour haptique (ScannerService), pour l'exigence « valider l'action sans
 * regarder l'écran ». Le son est un confort, jamais une condition bloquante :
 * s'il échoue (politique d'autoplay d'un navigateur avant toute interaction,
 * volume système coupé…), le scan lui-même n'est jamais impacté.
 */
class SoundService {
  constructor() {
    this.sound = null;
    this.loading = null;
  }

  async _ensureLoaded() {
    if (this.sound) return this.sound;
    if (!this.loading) {
      this.loading = Audio.Sound.createAsync({ uri: BEEP_DATA_URI }).then(({ sound }) => {
        this.sound = sound;
        return sound;
      });
    }
    return this.loading;
  }

  async playScanBeep() {
    try {
      const sound = await this._ensureLoaded();
      // Repart du début à chaque appel : un scan en rafale ne doit jamais
      // attendre la fin du bip précédent pour en émettre un nouveau.
      await sound.replayAsync();
    } catch {
      // Silencieux et volontaire — voir le commentaire de classe ci-dessus.
    }
  }
}

export default new SoundService();
