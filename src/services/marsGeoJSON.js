import GeoJSON from 'ol/format/GeoJSON.js';
import { MARS_GEOGRAPHIC } from '../map/sceneProjections.js';

const SUPPORTED_GEOMETRIES = new Set(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']);

function collectPositions(coordinates, positions) {
  if (!Array.isArray(coordinates)) return;
  if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    positions.push(coordinates);
    return;
  }
  coordinates.forEach((value) => collectPositions(value, positions));
}

export function validateMarsGeoJSON(collection) {
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    return { valid: false, reason: 'Expected a GeoJSON FeatureCollection.' };
  }
  if (collection.crs !== undefined) {
    return { valid: false, reason: 'Projected GeoJSON coordinates are not accepted; provide Mars geographic [longitude, latitude] degrees.' };
  }
  for (const [index, feature] of collection.features.entries()) {
    if (feature?.type !== 'Feature' || !SUPPORTED_GEOMETRIES.has(feature.geometry?.type)) {
      return { valid: false, reason: `Feature ${index + 1} has an unsupported or missing geometry.` };
    }
    const positions = [];
    collectPositions(feature.geometry.coordinates, positions);
    if (!positions.length) return { valid: false, reason: `Feature ${index + 1} has no coordinates.` };
    if (positions.some(([longitude, latitude]) => !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || longitude < -360 || longitude > 360)) {
      return { valid: false, reason: `Feature ${index + 1} contains invalid Mars longitude or latitude.` };
    }
  }
  return { valid: true, reason: null };
}

export function readMarsGeoJSON(collection, featureProjection, extraProperties = {}) {
  const validation = validateMarsGeoJSON(collection);
  if (!validation.valid) throw new TypeError(validation.reason);
  const format = new GeoJSON();
  return format.readFeatures(collection, {
    dataProjection: MARS_GEOGRAPHIC,
    featureProjection,
  }).map((feature) => {
    feature.setProperties(extraProperties, true);
    return feature;
  });
}
