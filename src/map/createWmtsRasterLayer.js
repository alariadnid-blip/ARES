import TileLayer from 'ol/layer/Tile.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';

export async function createWmtsRasterLayer(scene, projection) {
  const response = await fetch(scene.capabilitiesUrl);
  if (!response.ok) throw new Error(`NASA Mars Trek capabilities request failed (${response.status}).`);

  const capabilitiesXml = await response.text();
  // Mars Trek writes WMTS matrix dimensions as values such as "2.0", although
  // the WMTS schema defines them as integers. OpenLayers rejects those values
  // and silently produces an empty tile grid unless they are normalized.
  const normalizedCapabilitiesXml = capabilitiesXml.replace(
    /<(MatrixWidth|MatrixHeight)>(\d+)(?:\.0+)?<\/\1>/g,
    (_, name, value) => `<${name}>${Number.parseInt(value, 10)}</${name}>`,
  );
  const capabilities = new WMTSCapabilities().read(normalizedCapabilitiesXml);
  if (!capabilities) throw new Error('NASA Mars Trek returned unreadable WMTS metadata.');

  const options = optionsFromCapabilities(capabilities, {
    layer: scene.wmtsLayerId,
    matrixSet: scene.matrixSet,
    projection,
    requestEncoding: 'REST',
  });
  if (!options) throw new Error(`WMTS layer ${scene.wmtsLayerId} was not found in its capabilities.`);
  if (!options.urls?.length) throw new Error(`NASA Mars Trek did not publish tile URLs for ${scene.wmtsLayerId}.`);

  const highestMatrix = options.tileGrid.getFullTileRange(options.tileGrid.getMaxZoom());
  if (!highestMatrix || !Number.isFinite(highestMatrix.maxX) || !Number.isFinite(highestMatrix.maxY)) {
    throw new Error('NASA Mars Trek returned invalid WMTS tile matrix dimensions.');
  }

  const source = new WMTS({
    ...options,
    projection,
    crossOrigin: 'anonymous',
    attributions: 'NASA Mars Trek',
    wrapX: false,
  });

  return {
    source,
    layer: new TileLayer({ source, extent: scene.tileExtent ?? scene.extent }),
  };
}
