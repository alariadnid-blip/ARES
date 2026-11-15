import proj4 from 'proj4';
import { Projection, addProjection, get } from 'ol/proj.js';
import { register } from 'ol/proj/proj4.js';

export const PLACEHOLDER_PROJECTION_CODE = 'ARES:PLACEHOLDER';
export const PLACEHOLDER_PROJECTION = new Projection({
  code: PLACEHOLDER_PROJECTION_CODE,
  units: 'pixels',
  extent: [-2000, -1500, 2000, 1500],
});
addProjection(PLACEHOLDER_PROJECTION);

/**
 * Register the mission's Mars map projection once its authoritative CRS
 * definition and coordinate extent are supplied. No Earth projection is used
 * as a stand-in for Mars in the current placeholder map.
 */
export function configureMarsProjection({ code, definition, extent, units = 'm' }) {
  if (!code || !definition || !Array.isArray(extent) || extent.length !== 4) {
    throw new Error('Mars projection requires a code, proj4 definition, and [minX, minY, maxX, maxY] extent.');
  }

  proj4.defs(code, definition);
  const projection = new Projection({ code, units, extent });
  addProjection(projection);
  register(proj4);
  return projection;
}

export function getMarsProjection(code) {
  return code === PLACEHOLDER_PROJECTION_CODE ? PLACEHOLDER_PROJECTION : get(code);
}
