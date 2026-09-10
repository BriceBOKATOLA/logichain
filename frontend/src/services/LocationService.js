import * as Location from 'expo-location';

/**
 * LocationService — Encapsule la géolocalisation haute précision, avec parcimonie
 * sur la fréquence de mise à jour pour préserver la batterie des terminaux
 * professionnels (exigence non-fonctionnelle « Battery & Memory »).
 *
 * S'appuie sur `expo-location`, la bibliothèque effectivement déclarée dans les
 * dépendances du projet. La version précédente importait
 * `react-native-geolocation-service`, absent du package.json : tout scan
 * géolocalisé aurait planté au lancement.
 */
class LocationService {
  constructor() {
    this.permissionGranted = false;
  }

  /**
   * Demande la permission une seule fois par session. Sans elle, toute lecture
   * de position échoue silencieusement sur Android comme sur iOS.
   */
  async ensurePermission() {
    if (this.permissionGranted) return true;
    const { status } = await Location.requestForegroundPermissionsAsync();
    this.permissionGranted = status === 'granted';
    if (!this.permissionGranted) {
      throw new Error("Permission de géolocalisation refusée par l'utilisateur.");
    }
    return true;
  }

  async getCurrentPosition() {
    await this.ensurePermission();
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  }

  /**
   * Suivi continu de la position. Renvoie un abonnement dont il FAUT appeler
   * `clearWatch()` au démontage de l'écran : un suivi laissé actif vide la
   * batterie d'un terminal de terrain en quelques heures.
   */
  async watchPosition(callback, { intervalMs = 10000, distanceFilterMeters = 15 } = {}) {
    await this.ensurePermission();
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: distanceFilterMeters,
      },
      (position) => callback({ lat: position.coords.latitude, lng: position.coords.longitude }),
    );
  }

  clearWatch(subscription) {
    subscription?.remove?.();
  }
}

export default new LocationService();
