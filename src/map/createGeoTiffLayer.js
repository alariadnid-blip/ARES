import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import ImageLayer from 'ol/layer/Image.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import ImageStatic from 'ol/source/ImageStatic.js';

export function createGeoTiffLayer(scene, projection) {
  const sourceOptions = scene.remote ? { allowFullFile: false } : { allowFullFile: true };
  const source = new GeoTIFF({
    sources: [{ url: scene.file, bands: Array.from({ length: scene.bands }, (_, index) => index + 1), ...(scene.noData !== undefined ? { nodata: scene.noData } : {}) }],
    projection,
    normalize: false,
    convertToRGB: 'auto',
    transition: 0,
    interpolate: true,
    // Stream the public full-crater mosaic by byte range rather than forcing
    // the browser to download the entire source before it can draw the map.
    sourceOptions,
  });

  const channel = (band) => ['/', ['band', band], 255];
  const color = scene.bands === 1
    ? ['array', channel(1), channel(1), channel(1), 1]
    : ['array', channel(1), channel(2), channel(3), 1];

  const fallbackLayer = scene.previewFile
    ? new ImageLayer({
      source: new ImageStatic({ url: scene.previewFile, imageExtent: scene.extent, projection, crossOrigin: 'anonymous' }),
      extent: scene.extent,
    })
    : null;

  return { source, layer: new WebGLTileLayer({ source, style: { color }, extent: scene.extent }), fallbackLayer };
}
