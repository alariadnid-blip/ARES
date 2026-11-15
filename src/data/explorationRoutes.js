import routeData from './routes/jezeroPlanningRoutes.json';
import { planningStops } from './planningStops.js';

const pointsById = Object.fromEntries(planningStops.map((point) => [point.id, point]));
const waypointFeatures = routeData.features.filter((feature) => feature.geometry.type === 'Point');

export const explorationRoutes = routeData.features
  .filter((feature) => feature.geometry.type === 'LineString')
  .map((feature) => {
    const { properties, geometry } = feature;
    const points = waypointFeatures
      .filter((waypoint) => waypoint.properties.routeId === properties.id)
      .sort((a, b) => a.properties.sequence - b.properties.sequence)
      .map((waypoint) => {
        const [longitude, latitude] = waypoint.geometry.coordinates;
        const point = pointsById[waypoint.properties.pointId];
        return {
          ...point,
          ...waypoint.properties,
          latitude,
          longitude,
          routeId: properties.id,
          description: point?.description ?? `${waypoint.properties.name} waypoint.`,
        };
      });
    return {
      id: properties.id,
      name: properties.name,
      type: properties.routeType,
      status: properties.status,
      source: properties.source,
      description: properties.description,
      geoJSONCoordinates: geometry.coordinates,
      points,
    };
  });
