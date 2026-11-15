import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteFeatureCollection, marsDistanceKm, normalizeEastLongitude, summarizeRoute } from './marsRoute.js';

test('Mars great-circle distance is zero for the same point', () => {
  assert.equal(marsDistanceKm({ latitude: 18, longitude: 77 }, { latitude: 18, longitude: 77 }), 0);
});

test('Mars great-circle distance uses the Mars radius', () => {
  const distance = marsDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
  assert.ok(Math.abs(distance - 59.16) < 0.1);
});

test('route summary reports segment distance and simplified time', () => {
  const summary = summarizeRoute([
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ], 2);
  assert.equal(summary.segments.length, 1);
  assert.ok(Math.abs(summary.distanceKm - 59.16) < 0.1);
  assert.ok(Math.abs(summary.estimatedHours - 29.58) < 0.1);
});

test('GeoJSON export uses longitude, latitude order and normalizes longitude', () => {
  const collection = createRouteFeatureCollection(
    { id: 'r1', name: 'Test route', type: 'custom', status: 'custom', source: 'ARES' },
    [
      { id: 'p1', sequence: 1, name: 'Start', latitude: 18, longitude: 181 },
      { id: 'p2', sequence: 2, name: 'End', latitude: 19, longitude: 182 },
    ],
  );
  assert.equal(collection.type, 'FeatureCollection');
  assert.deepEqual(collection.features[0].geometry.coordinates, [[-179, 18], [-178, 19]]);
  assert.deepEqual(collection.features[1].geometry.coordinates, [-179, 18]);
  assert.match(collection.features[0].properties.coordinateSystem, /\[longitude east, latitude\]/);
});

test('GeoJSON export rejects invalid latitude', () => {
  assert.throws(() => createRouteFeatureCollection(
    { id: 'r1', name: 'Broken', type: 'custom', status: 'custom' },
    [{ latitude: 91, longitude: 10 }],
  ), /Invalid Mars coordinate/);
});

test('longitude normalization follows GeoJSON longitude bounds', () => {
  assert.equal(normalizeEastLongitude(540), -180);
});
