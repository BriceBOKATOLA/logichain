import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { colors, spacing, typography } from '../theme/theme';
import { useEventContext } from '../context/EventContext';
import { useMapData } from '../hooks/useMapData';

/**
 * MapScreen — Vue PURE : affiche les zones GeoJSON et les items géolocalisés
 * fournis par useMapData(). Aucun appel réseau ici — uniquement du rendu.
 */
export default function MapScreen() {
  const { eventId } = useEventContext();
  const { zones, items, loading, error } = useMapData(eventId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.text}>Chargement de la carte…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error}</Text>
      </View>
    );
  }

  const firstZonePoint = zones[0]?.geometry?.coordinates?.[0]?.[0];
  const initialRegion = firstZonePoint
    ? { latitude: firstZonePoint[1], longitude: firstZonePoint[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: 48.855, longitude: 2.355, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: { ...typography.body, textAlign: 'center', marginTop: spacing.md },
});
