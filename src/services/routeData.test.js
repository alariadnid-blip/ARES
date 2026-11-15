import test from 'node:test';
import assert from 'node:assert/strict';
import routeDataset from '../data/routes/jezeroPlanningRoutes.json' with { type: 'json' };
import planningLandmarks from '../data/scientific-points/jezeroPlanningLandmarks.json' with { type: 'json' };
import { validateMarsGeoJSON } from './marsGeoJSON.js';

test('route and science point datasets are valid Mars GeoJSON', () => {
  assert.equal(validateMarsGeoJSON(routeDataset).valid, true);
  assert.equal(validateMarsGeoJSON(planningLandmarks).valid, true);
});

test('each route line matches its ordered waypoint coordinates', () => {
  const points = routeDataset.features.filter((feature) => feature.geometry.type === 'Point');
  const routes = routeDataset.features.filter((feature) => feature.geometry.type === 'LineString');
  assert.equal(routes.length, 3);
  routes.forEach((route) => {
    const routePoints = points
      .filter((feature) => feature.properties.routeId === route.properties.id)
      .sort((a, b) => a.properties.sequence - b.properties.sequence)
      .map((feature) => feature.geometry.coordinates);
    assert.ok(routePoints.length >= 2);
    assert.deepEqual(route.geometry.coordinates, routePoints);
  });
});
