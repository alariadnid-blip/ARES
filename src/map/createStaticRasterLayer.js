import ImageLayer from 'ol/layer/Image.js';
import ImageStatic from 'ol/source/ImageStatic.js';

export function createStaticRasterLayer(scene, projection) {
  const source = new ImageStatic({
    url: scene.file,
    imageExtent: scene.extent,
    projection,
    crossOrigin: 'anonymous',
  });

  return {
    source,
    layer: new ImageLayer({ source, extent: scene.extent }),
  };
}
