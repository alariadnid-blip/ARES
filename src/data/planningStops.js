import planningLandmarks from './scientific-points/jezeroPlanningLandmarks.json';

export const planningStops = planningLandmarks.features.map((feature) => ({
  ...feature.properties,
  longitude: feature.geometry.coordinates[0],
  latitude: feature.geometry.coordinates[1],
  source: planningLandmarks.metadata.source,
}));
