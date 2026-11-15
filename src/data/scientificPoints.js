import planningLandmarks from './scientific-points/jezeroPlanningLandmarks.json';

export const conceptSciencePoints = planningLandmarks.features.map((feature) => ({
  ...feature.properties,
  longitude: feature.geometry.coordinates[0],
  latitude: feature.geometry.coordinates[1],
  significance: `${feature.properties.name} is labeled in the user-supplied ARES concept map. Its plotted position is approximate and needs verification against a georeferenced scientific source.`,
  source: planningLandmarks.metadata.source,
}));
