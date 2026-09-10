import Geolocation from 'react-native-geolocation-service';
// import * as Location from 'expo-location';

/**
 * LocationService — Encapsule la géolocalisation haute précision native,
 * avec parcimonie sur la fréquence de mise à jour pour préserver la batterie
 * des terminaux professionnels (exigence non-fonctionnelle "Battery & Memory").
 */
class LocationService {
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    });
  }

  watchPosition(callback, { intervalMs = 10000, distanceFilterMeters = 15 } = {}) {
    return Geolocation.watchPosition(
      (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('LocationService watch error', err),
      { enableHighAccuracy: true, interval: intervalMs, distanceFilter: distanceFilterMeters },
    );
  }

  clearWatch(watchId) {
    Geolocation.clearWatch(watchId);
  }
}

export default new LocationService();
