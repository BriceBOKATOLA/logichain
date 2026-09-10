import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TASK_NAME = 'logichain-background-location';

class BackgroundLocationServiceImpl {
  constructor() {
    this.onUpdate = null;
    this.started = false;
  }

  /**
   * Démarre le suivi de position en arrière-plan, géré AVEC PARCIMONIE — exigence
   * explicite du cahier des charges (« Battery & Memory ») : un point toutes les
   * 60 secondes OU tous les 50 mètres parcourus, jamais en continu. C'est une
   * fréquence adaptée à un déplacement piéton/véhicule lent sur un site
   * événementiel, pas à un suivi temps réel.
   *
   * Indisponible sur le web : l'API de localisation en arrière-plan d'Expo n'y
   * est pas implémentée (les navigateurs ne l'exposent pas de la même façon
   * qu'un système d'exploitation mobile) — on ne tente jamais de la démarrer
   * hors plateforme native.
   */
  async start(onUpdate) {
    if (Platform.OS === 'web' || this.started) return false;

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return false;

    // Permission distincte et plus sensible : on la demande, mais un refus ne
    // doit jamais bloquer le reste de l'application (l'agent reste opérationnel
    // sans ce suivi, simplement sans mise à jour automatique de son secteur).
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') return false;

    this.onUpdate = onUpdate;
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'LogiChain',
        notificationBody: 'Suivi de position actif pour cet événement',
      },
    });
    this.started = true;
    return true;
  }

  async stop() {
    if (!this.started) return;
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) await Location.stopLocationUpdatesAsync(TASK_NAME);
    this.started = false;
    this.onUpdate = null;
  }
}

const instance = new BackgroundLocationServiceImpl();

// Doit être défini une seule fois, au chargement du module : TaskManager
// invoque ce callback même lorsque l'application est en arrière-plan, donc
// en dehors de tout cycle de vie de composant React.
TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error || !data) return;
  const last = data.locations?.[data.locations.length - 1];
  if (last && instance.onUpdate) {
    instance.onUpdate({ lat: last.coords.latitude, lng: last.coords.longitude });
  }
});

export default instance;
