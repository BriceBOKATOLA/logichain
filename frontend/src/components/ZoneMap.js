import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { colors } from '../theme/theme';

/**
 * ZoneMap — Rendu natif (Android/iOS) de la carte des zones et du matériel
 * géolocalisé, via react-native-maps.
 *
 * Ce fichier a un jumeau `ZoneMap.web.js` : Metro choisit automatiquement la
 * bonne implémentation selon la plateforme (résolution d'extension standard
 * de React Native), sans le moindre `Platform.OS` dans MapScreen. C'est
 * nécessaire ici car react-native-maps n'a pas de rendu web fiable.
 */
export default function ZoneMap({ zones, items, initialRegion }) {
  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
      {zones.map((zone) => (
        <Polygon
          key={zone._id}
          coordinates={zone.geometry.coordinates[0].map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }))}
          strokeColor={colors.primary}
          fillColor={colors.primary + '33'}
        />
      ))}
      {items.map((item) => (
        <Marker
          key={item._id}
          coordinate={{ latitude: item.location.coordinates[1], longitude: item.location.coordinates[0] }}
          title={item.label}
          description={item.state}
        />
      ))}
    </MapView>
  );
}
