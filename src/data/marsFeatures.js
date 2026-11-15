const usgsFeature = (id, name, latitude, longitudeEast, diameterKm, labelOffsetY = -14) => ({
  id,
  name,
  type: 'Crater',
  latitude,
  longitudeEast,
  diameterKm,
  labelOffsetY,
  sourceUrl: `https://planetarynames.wr.usgs.gov/Feature/${id}`,
});

// Official IAU/USGS Gazetteer center coordinates and catalog diameters.
// Gazetteer longitudes are east-positive on a 0–360° system.
export const namedMarsCraters = [
  usgsFeature(14300, 'Jezero', 18.41, 77.69, 47.52, -20),
  usgsFeature(2071, 'Gale', -5.44, 137.70, 155.30),
  usgsFeature(2289, 'Gusev', -14.53, 175.52, 158.12),
  usgsFeature(2540, 'Holden', -26.04, 325.98, 152.66, 18),
  usgsFeature(1706, 'Eberswalde', -23.98, 326.70, 62.19, -18),
  usgsFeature(3091, 'Korolev', 72.77, 164.58, 81.37),
  usgsFeature(2596, 'Huygens', -14.14, 55.40, 470.00),
  usgsFeature(5366, 'Schiaparelli', -2.67, 16.70, 471.00),
  usgsFeature(3494, 'Lowell', -51.97, 278.60, 203.00),
  usgsFeature(2479, 'Herschel', -14.73, 129.70, 304.50),
  usgsFeature(3538, 'Lyot', 50.47, 29.30, 236.00),
  usgsFeature(14326, 'Miyamoto', -2.87, 353.05, 145.21, -18),
  usgsFeature(3951, 'Mojave', 7.41, 326.90, 58.50),
  usgsFeature(14501, 'Endeavour', -2.28, 354.80, 21.78, 16),
];

export const perseveranceLandingSite = {
  id: 'perseverance-landing-site',
  name: 'Perseverance landing site',
  type: 'Mission landing site',
  latitude: 18.4447,
  longitudeEast: 77.4508,
  sourceUrl: 'https://psg.gsfc.nasa.gov/apps/mars/',
};

export const namedFeatureSource = 'https://planetarynames.wr.usgs.gov/GIS_Downloads';

export function normalizeMarsLongitude(longitudeEast) {
  return ((longitudeEast + 180) % 360 + 360) % 360 - 180;
}
