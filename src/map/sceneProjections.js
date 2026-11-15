import { configureMarsProjection, getMarsProjection } from './marsProjection.js';

// CRS definitions are derived from the GeoTIFF GeoKeys. The two products use
// different Mars geodetic models, so each scene keeps its native projection.
export const MARS_GEOGRAPHIC = configureMarsProjection({
  code: 'ARES:MARS:GEOGRAPHIC',
  definition: '+proj=longlat +a=3396190 +rf=169.8944472236118 +no_defs +type=crs',
  extent: [-180, -90, 180, 90],
  units: 'degrees',
});

// NASA Mars Trek advertises the same Mars 2000 geographic datum under this
// OGC CRS identifier. Registering it lets OpenLayers build its WMTS tile grid
// directly from the service capabilities.
export const MARS_TREK_GEOGRAPHIC = configureMarsProjection({
  code: 'urn:ogc:def:crs:EPSG::104905',
  definition: '+proj=longlat +a=3396190 +rf=169.8944472236118 +no_defs +type=crs',
  extent: [-180, -90, 180, 90],
  units: 'degrees',
});

export const MARS_EQUIRECTANGULAR_SPHERE = configureMarsProjection({
  code: 'ARES:MARS:EQC_SPHERE',
  definition: '+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +a=3396190 +b=3396190 +x_0=0 +y_0=0 +units=m +no_defs +type=crs',
  extent: [-10668000, -5334000, 10668000, 5334000],
  units: 'm',
});

export const JEZERO_CTX_EQUIRECTANGULAR = configureMarsProjection({
  code: 'ARES:MARS:JEZERO_CTX_EQC',
  definition: '+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +a=3396160 +b=3396160 +x_0=0 +y_0=0 +units=m +no_defs +type=crs',
  extent: [4563518.650449612, 1042039.9775932481, 4657764.586989616, 1143398.8150041956],
  units: 'm',
});

export function getSceneProjection(code) {
  return getMarsProjection(code);
}
