import { perseveranceLandingSite } from './marsFeatures.js';

// The named points below come from the ARES route concept map supplied by the
// user. Coordinates other than the landing site are approximate labels from
// that illustration and must not be treated as surveyed or NASA traverse data.
const conceptStops = [
  { id: 'landing', name: 'Perseverance landing site', latitude: perseveranceLandingSite.latitude, longitude: perseveranceLandingSite.longitudeEast, sourceUrl: perseveranceLandingSite.sourceUrl, verified: true, description: 'Published Perseverance touchdown location. The ARES planning route begins here.' },
  { id: 'seitah', name: 'Séítah', latitude: 18.6, longitude: 77.5, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
  { id: 'south-seitah', name: 'South Séítah', latitude: 18.5, longitude: 77.5, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
  { id: 'maaz', name: 'Máaz Formation', latitude: 18.4, longitude: 77.5, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
  { id: 'three-forks', name: 'Three Forks', latitude: 18.4, longitude: 77.7, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
  { id: 'ancient-delta', name: 'Ancient Delta', latitude: 18.5, longitude: 77.7, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
  { id: 'crater-rim', name: 'Crater rim', latitude: 18.7, longitude: 77.3, description: 'Approximate planning landmark transcribed from the supplied concept map.' },
];

const stopById = Object.fromEntries(conceptStops.map((stop) => [stop.id, stop]));
const makeRoute = (id, name, type, pointIds, description) => ({
  id,
  name,
  type,
  status: 'illustrative',
  source: 'ARES demonstration route, based on approximate labels in the user-supplied concept map; not a NASA traverse and not terrain-validated.',
  sourceUrl: null,
  description,
  points: pointIds.map((pointId, index) => ({ ...stopById[pointId], id: `${id}-${pointId}`, routeId: id, sequence: index + 1 })),
});

export const explorationRoutes = [
  makeRoute('primary', 'Primary expedition concept', 'primary', ['landing', 'seitah', 'south-seitah', 'maaz', 'three-forks', 'ancient-delta'], 'Approximate route concept shown in the supplied ARES reference image.'),
  makeRoute('alternative-a', 'Alternative A · rim approach', 'alternative', ['landing', 'crater-rim', 'seitah', 'ancient-delta'], 'Illustrative comparison using only landmarks labeled in the supplied concept map.'),
  makeRoute('alternative-b', 'Alternative B · southern approach', 'alternative', ['landing', 'south-seitah', 'maaz', 'three-forks', 'ancient-delta'], 'Illustrative comparison using only landmarks labeled in the supplied concept map.'),
];

export const conceptSciencePoints = conceptStops.slice(1).map((point) => ({
  ...point,
  classification: 'Planning landmark',
  significance: `${point.name} is labeled in the user-supplied ARES concept map. Its plotted position is approximate and needs verification against a georeferenced scientific source.`,
  source: 'User-supplied ARES concept map; approximate coordinates shown on that illustration.',
}));

export const roverPhotographs = [
  {
    id: 'PIA26378',
    title: 'Perseverance’s Mid-Climb View of Jezero Crater',
    imageUrl: '/data/rover-observations/PIA26378.jpg',
    rover: 'Perseverance',
    camera: 'Mastcam-Z',
    date: 'September 27, 2024 · Sol 1,282',
    description: 'A 44-frame panorama acquired as Perseverance climbed Jezero’s western rim, near the mission-named Faraway Rock. NASA’s record does not provide a map coordinate for the panorama in the metadata used here, so it is shown in the gallery and is not plotted as a point.',
    sourceUrl: 'https://science.nasa.gov/resource/perseverances-mid-climb-view-of-jezero-crater/',
    credit: 'NASA/JPL-Caltech/ASU/MSSS',
  },
  {
    id: 'PIA24744',
    title: 'The End of One Drive on the Floor of Jezero Crater',
    imageUrl: '/data/rover-observations/PIA24744.jpg',
    rover: 'Perseverance',
    camera: 'Navigation Cameras (Navcam)',
    date: 'July 3, 2021 · Sol 131',
    description: 'A Navcam panorama of a Martian vista on the crater floor; the rover’s tracks from that day’s autonomous drive are visible on the right. Exact observation coordinates are not included in the catalog record used here, so this image is not plotted as a point.',
    sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA24744',
    credit: 'NASA/JPL-Caltech',
  },
];

export const terrainDataStatus = {
  status: 'unknown',
  source: null,
  message: 'No Jezero DEM or verified hazard polygons are installed. Terrain is UNKNOWN; no area is marked safe or hazardous.',
};
