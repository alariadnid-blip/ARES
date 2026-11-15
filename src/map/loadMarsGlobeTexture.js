// Keep both dimensions powers of two: the WebGL 1 context used by older
// browsers cannot repeat a non-power-of-two texture across the longitude seam.
const TEXTURE_SIZE = { width: 2048, height: 1024 };
const REFERENCE_TEXTURE_URL = `${import.meta.env.BASE_URL}mission/mars-global-reference.jpg`;
const ROBINSON_X = [1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const ROBINSON_Y = [0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1];
const texturePromises = new Map();

function childText(element, name) {
  return element?.getElementsByTagNameNS('*', name)[0]?.textContent?.trim() ?? '';
}

function directChildText(element, name) {
  const child = [...(element?.children ?? [])].find((item) => item.localName === name);
  return child?.textContent?.trim() ?? '';
}

function tileUrl(template, matrixSet, style, matrix, row, column) {
  const values = {
    TileMatrixSet: matrixSet,
    TileMatrix: matrix,
    TileRow: row,
    TileCol: column,
    Style: style,
  };
  return Object.entries(values).reduce((url, [key, value]) => (
    url.replaceAll(`{${key}}`, value).replaceAll(`{${key.toLowerCase()}}`, value)
  ), template);
}

function parseCapabilities(xml, scene) {
  const layers = [...xml.getElementsByTagNameNS('*', 'Layer')];
  const layer = layers.find((item) => directChildText(item, 'Identifier') === scene.wmtsLayerId) ?? layers[0];
  if (!layer) throw new Error('NASA global map metadata contains no map layer.');

  const matrixSets = [...xml.getElementsByTagNameNS('*', 'TileMatrixSet')]
    // TileMatrixSetLink contains only a reference and limits. Select the actual
    // TileMatrixSet definition, which has the matrix dimensions needed below.
    .filter((item) => [...item.children].some((child) => child.localName === 'TileMatrix'));
  const matrixSet = matrixSets.find((item) => directChildText(item, 'Identifier') === scene.matrixSet);
  const matrices = [...(matrixSet?.children ?? [])].filter((item) => item.localName === 'TileMatrix');
  if (matrices.length === 0) throw new Error(`NASA global map has no matrix definition for ${scene.matrixSet}.`);

  // The smallest tile matrix is the coarsest full-planet overview and limits
  // startup to only the few tiles needed to texture the globe.
  const matrix = matrices
    .map((item) => ({
      element: item,
      width: Number(childText(item, 'MatrixWidth')),
      height: Number(childText(item, 'MatrixHeight')),
    }))
    .filter((item) => Number.isInteger(item.width) && item.width > 0 && Number.isInteger(item.height) && item.height > 0)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0];
  if (!matrix) throw new Error('NASA global map has invalid tile matrix dimensions.');

  const styleNodes = [...layer.getElementsByTagNameNS('*', 'Style')];
  const defaultStyle = styleNodes.find((item) => item.getAttribute('isDefault') === 'true') ?? styleNodes[0];
  const style = childText(defaultStyle, 'Identifier') || 'default';
  const resources = [...layer.getElementsByTagNameNS('*', 'ResourceURL')];
  const tileResource = resources.find((item) => item.getAttribute('resourceType')?.toLowerCase() === 'tile');
  const resourceTemplate = tileResource?.getAttribute('template');
  const template = resourceTemplate
    ? new URL(resourceTemplate, scene.capabilitiesUrl).href
    : scene.tileUrl;
  if (!template) throw new Error('NASA global map metadata has no tile URL template.');

  return {
    template,
    matrixSet: directChildText(matrixSet, 'Identifier'),
    matrixId: childText(matrix.element, 'Identifier'),
    matrixWidth: matrix.width,
    matrixHeight: matrix.height,
    style,
  };
}

async function loadNasaTexture(scene) {
  const capabilitiesResponse = await fetch(scene.capabilitiesUrl);
  if (!capabilitiesResponse.ok) throw new Error(`NASA map metadata returned ${capabilitiesResponse.status}.`);
  const xml = new DOMParser().parseFromString(await capabilitiesResponse.text(), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('NASA map metadata could not be read.');

  const { template, matrixSet, matrixId, matrixWidth, matrixHeight, style } = parseCapabilities(xml, scene);
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE.width;
  canvas.height = TEXTURE_SIZE.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The browser could not create a Mars texture canvas.');
  context.fillStyle = '#211c1a';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const tileCount = matrixWidth * matrixHeight;
  if (tileCount > 32) throw new Error('NASA global overview matrix has an unexpected number of tiles.');
  await Promise.all(Array.from({ length: tileCount }, async (_, index) => {
    const column = index % matrixWidth;
    const row = Math.floor(index / matrixWidth);
    const url = tileUrl(template, matrixSet, style, matrixId, row, column);
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`NASA global map tile returned ${response.status}.`);
    const bitmap = await createImageBitmap(await response.blob());
    try {
      context.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        column * canvas.width / matrixWidth,
        row * canvas.height / matrixHeight,
        canvas.width / matrixWidth,
        canvas.height / matrixHeight,
      );
    } finally {
      bitmap.close?.();
    }
  }));

  return { canvas, source: 'nasa' };
}

async function loadReferenceTexture() {
  const image = new Image();
  image.decoding = 'async';
  image.src = REFERENCE_TEXTURE_URL;
  await image.decode();

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('The local Mars reference image could not be read.');
  sourceContext.drawImage(image, 0, 0);
  const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE.width;
  canvas.height = TEXTURE_SIZE.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The local Mars reference texture could not be rendered.');
  const output = context.createImageData(canvas.width, canvas.height);
  const sourceCenterX = sourceCanvas.width / 2;
  const sourceCenterY = sourceCanvas.height * 0.49;
  // Exclude the map's printed border, coordinate ticks, and footer. The bundled
  // reference is an oval Robinson-style plate rather than a cylindrical raster.
  const sourceHalfWidth = sourceCanvas.width * 0.49;
  const sourceHalfHeight = sourceCanvas.height * 0.455;

  for (let y = 0; y < canvas.height; y += 1) {
    const latitude = 90 - y / (canvas.height - 1) * 180;
    const absoluteLatitude = Math.abs(latitude);
    const coefficientIndex = Math.min(17, Math.floor(absoluteLatitude / 5));
    const fraction = absoluteLatitude / 5 - coefficientIndex;
    const xCoefficient = ROBINSON_X[coefficientIndex]
      + (ROBINSON_X[coefficientIndex + 1] - ROBINSON_X[coefficientIndex]) * fraction;
    const yCoefficient = ROBINSON_Y[coefficientIndex]
      + (ROBINSON_Y[coefficientIndex + 1] - ROBINSON_Y[coefficientIndex]) * fraction;
    const sourceY = Math.max(0, Math.min(sourceCanvas.height - 1,
      sourceCenterY - Math.sign(latitude) * yCoefficient * sourceHalfHeight));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(sourceCanvas.height - 1, y0 + 1);
    const yFraction = sourceY - y0;
    for (let x = 0; x < canvas.width; x += 1) {
      const longitude = x / (canvas.width - 1) * 2 - 1;
      const sourceX = Math.max(0, Math.min(sourceCanvas.width - 1,
        sourceCenterX + longitude * xCoefficient * sourceHalfWidth));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(sourceCanvas.width - 1, x0 + 1);
      const xFraction = sourceX - x0;
      const sourceTopLeft = (y0 * sourceCanvas.width + x0) * 4;
      const sourceTopRight = (y0 * sourceCanvas.width + x1) * 4;
      const sourceBottomLeft = (y1 * sourceCanvas.width + x0) * 4;
      const sourceBottomRight = (y1 * sourceCanvas.width + x1) * 4;
      const destination = (y * canvas.width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const top = source.data[sourceTopLeft + channel]
          + (source.data[sourceTopRight + channel] - source.data[sourceTopLeft + channel]) * xFraction;
        const bottom = source.data[sourceBottomLeft + channel]
          + (source.data[sourceBottomRight + channel] - source.data[sourceBottomLeft + channel]) * xFraction;
        output.data[destination + channel] = top + (bottom - top) * yFraction;
      }
      output.data[destination + 3] = 255;
    }
  }

  // The equirectangular texture wraps from +180° back to -180°. Blend the
  // matching outer edges together so the wrap does not appear as a vertical
  // seam on the rotating globe. Keep the central meridian and its landforms intact.
  const unsmoothed = new Uint8ClampedArray(output.data);
  const seamWidth = Math.round(canvas.width * 0.008);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let offset = 0; offset < seamWidth; offset += 1) {
      const blend = (1 - offset / seamWidth) * 0.82;
      const left = (y * canvas.width + offset) * 4;
      const right = (y * canvas.width + canvas.width - 1 - offset) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const sharedEdge = (unsmoothed[left + channel] + unsmoothed[right + channel]) / 2;
        output.data[left + channel] = unsmoothed[left + channel]
          + (sharedEdge - unsmoothed[left + channel]) * blend;
        output.data[right + channel] = unsmoothed[right + channel]
          + (sharedEdge - unsmoothed[right + channel]) * blend;
      }
    }
  }

  context.putImageData(output, 0, 0);
  return { canvas, source: 'reference' };
}

async function loadTexture(scene) {
  try {
    return await loadNasaTexture(scene);
  } catch (nasaError) {
    console.warn('ARES could not load the NASA Mars globe tiles; using the bundled reference texture.', nasaError);
    const reference = await loadReferenceTexture();
    return { ...reference, error: nasaError };
  }
}

/** Loads the global NASA raster, with the bundled map as a clearly identified offline fallback. */
export function loadMarsGlobeTexture(scene) {
  const cacheKey = scene.capabilitiesUrl ?? scene.id;
  if (!texturePromises.has(cacheKey)) {
    texturePromises.set(cacheKey, loadTexture(scene).catch((error) => {
      texturePromises.delete(cacheKey);
      throw error;
    }));
  }
  return texturePromises.get(cacheKey);
}
