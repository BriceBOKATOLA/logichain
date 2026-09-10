import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
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

/**
 * Leaflet ne mesure la taille de son conteneur QU'UNE SEULE FOIS, au moment de
 * son initialisation. Ici, la carte est montée à l'intérieur d'un écran de
 * React Navigation dont la mise en page (View en `flex: 1`, chaîne de hauteurs
 * en pourcentage jusqu'à `#root`) peut ne pas être encore stabilisée à cet
 * instant précis : le conteneur mesure alors 0×0, Leaflet initialise ses
 * tuiles sur cette taille, et la carte reste visuellement vide même si le DOM
 * est correct et que la taille finale s'est bien résolue juste après.
 *
 * On force une remesure (`invalidateSize`) juste après le premier rendu, et à
 * chaque redimensionnement de la fenêtre — c'est le correctif standard et
 * documenté de l'écosystème react-leaflet pour ce piège classique.
 */
function InvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  return null;
}

export default function ZoneMap({ zones, items, initialRegion }) {
  const center = [initialRegion.latitude, initialRegion.longitude];
  // Conversion approximative delta -> niveau de zoom Leaflet, cohérente avec
  // le delta utilisé côté natif pour une région équivalente à l'écran.
  const zoom = 15;

  return (
    <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
      <InvalidateSizeOnMount />
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
