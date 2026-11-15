import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMarsGeoJSON } from './marsGeoJSON.js';
import { calculateSlopeDegrees } from './terrainAnalysisService.js';

test('empty hazard GeoJSON collections are valid and remain data-empty', () => {
  assert.deepEqual(validateMarsGeoJSON({ type: 'FeatureCollection', features: [] }), { valid: true, reason: null });
});

test('Mars GeoJSON validation rejects non-FeatureCollections', () => {
  assert.equal(validateMarsGeoJSON({ type: 'Feature', geometry: null }).valid, false);
});

test('Mars GeoJSON validation rejects an ambiguous projected CRS', () => {
  assert.equal(validateMarsGeoJSON({ type: 'FeatureCollection', crs: { type: 'name', properties: { name: 'EPSG:3857' } }, features: [] }).valid, false);
});

test('Mars GeoJSON validation rejects unsupported geometry and out-of-range coordinates', () => {
  const unsupported = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'GeometryCollection', geometries: [] }, properties: {} }] };
  const badLatitude = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [77, 91] }, properties: {} }] };
  assert.equal(validateMarsGeoJSON(unsupported).valid, false);
  assert.equal(validateMarsGeoJSON(badLatitude).valid, false);
});

test('DEM slope estimates recover a one-to-one planar gradient in degrees', () => {
  const elevations = new Float32Array([0, 1, 2, 0, 1, 2, 0, 1, 2]);
  const slopes = calculateSlopeDegrees({ elevations, width: 3, height: 3, pixelSizeX: 1, pixelSizeY: 1 });
  assert.ok(Math.abs(slopes[4] - 45) < 0.01);
  assert.ok(Number.isNaN(slopes[0]));
});

test('DEM slope estimator rejects invalid pixel spacing', () => {
  assert.throws(() => calculateSlopeDegrees({ elevations: new Float32Array(9), width: 3, height: 3, pixelSizeX: 0, pixelSizeY: 1 }), /positive metres/);
});
