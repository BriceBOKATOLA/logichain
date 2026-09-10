import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../theme/theme';

/**
 * ZoneMap.web — Rendu web de la carte des zones et du matériel géolocalisé,
 * via Leaflet + OpenStreetMap. Aucune clé d'API requise, contrairement aux
 * wrappers web de Google Maps.
 *
 * Metro sélectionne ce fichier automatiquement pour les builds web (extension
 * `.web.js`) : react-native-maps, utilisé par `ZoneMap.js`, n'a pas de rendu
 * web fiable et n'est donc jamais importé dans le bundle web.
 *
 * Icône de marqueur en `divIcon` (point coloré en CSS) plutôt que l'icône PNG
 * par défaut de Leaflet : cette dernière référence des chemins d'image qui se
 * cassent systématiquement sous les bundlers (Webpack, Metro, Vite...) sans
 * configuration supplémentaire — un point stylé évite ce piège classique.
 */
const itemIcon = L.divIcon({
  className: 'logichain-marker',
  html: `<div style="
    width: 16px; height: 16px; border-radius: 50%;
    background: ${colors.primary}; border: 2px solid #0F1712;
    box-shadow: 0 0 0 2px ${colors.primary}55;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function ZoneMap({ zones, items, initialRegion }) {
  const center = [initialRegion.latitude, initialRegion.longitude];
  // Conversion approximative delta -> niveau de zoom Leaflet, cohérente avec
  // le delta utilisé côté natif pour une région équivalente à l'écran.
  const zoom = 15;

  return (
    <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map((zone) => (
        <Polygon
          key={zone._id}
          positions={zone.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: colors.primary, fillColor: colors.primary, fillOpacity: 0.2 }}
        />
      ))}
      {items.map((item) => (
        <Marker
          key={item._id}
          position={[item.location.coordinates[1], item.location.coordinates[0]]}
          icon={itemIcon}
        >
          <Popup>
            <strong>{item.label}</strong>
            <br />
            {item.state}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
