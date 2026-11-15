export const MARS_MEAN_RADIUS_KM = 3389.5;

export function normalizeEastLongitude(longitude) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

export function isValidMarsPoint(point) {
  return Number.isFinite(point?.latitude)
    && Math.abs(point.latitude) <= 90
    && Number.isFinite(point?.longitude)
    && point.longitude >= -360
    && point.longitude <= 360;
}

export function marsDistanceKm(a, b) {
  if (!isValidMarsPoint(a) || !isValidMarsPoint(b)) return NaN;
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(normalizeEastLongitude(b.longitude - a.longitude));
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * MARS_MEAN_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function summarizeRoute(points, speedKmH = 1) {
  const segments = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    distanceKm: marsDistanceKm(points[index], point),
  }));
  const distanceKm = segments.reduce((total, segment) => total + segment.distanceKm, 0);
  return {
    segments,
    distanceKm,
    speedKmH,
    estimatedHours: speedKmH > 0 ? distanceKm / speedKmH : null,
  };
}

export function createRouteFeatureCollection(route, points, status = route.status ?? 'custom') {
  const coordinates = points.map((point) => [normalizeEastLongitude(point.longitude), point.latitude]);
  const routeProperties = {
    id: route.id,
    name: route.name,
    type: route.type,
    status,
    source: route.source ?? 'ARES user-created route',
    coordinateSystem: 'Mars 2000 geographic, planetocentric latitude; coordinates are [longitude east, latitude] in degrees.',
  };
  const features = [];
  if (coordinates.length >= 2) {
    features.push({
      type: 'Feature',
      properties: routeProperties,
      geometry: { type: 'LineString', coordinates },
    });
  }
  points.forEach((point, index) => {
    if (!isValidMarsPoint(point)) throw new TypeError(`Invalid Mars coordinate for waypoint ${index + 1}`);
    features.push({
      type: 'Feature',
      properties: { ...routeProperties, id: point.id, sequence: point.sequence ?? index + 1, name: point.name ?? `Waypoint ${index + 1}` },
      geometry: { type: 'Point', coordinates: [normalizeEastLongitude(point.longitude), point.latitude] },
    });
  });
  return { type: 'FeatureCollection', features };
}

export function downloadRouteGeoJSON(route, points, status) {
  const collection = createRouteFeatureCollection(route, points, status);
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${route.id || 'ares-route'}.geojson`;
  anchor.click();
  URL.revokeObjectURL(url);
}
