export const layerCatalog = [
  { id: 'base', label: 'Jezero CTX mosaic', detail: 'NASA CTX · 6 m/px', icon: '◉', available: true, sceneId: 'jezero' },
  { id: 'mars-global', label: 'Mars global surface', detail: 'MOLA + HRSC · 200 m/px', icon: '◎', available: true, sceneId: 'mars-global' },
  { id: 'imagery', label: 'HiRISE landing-area detail', detail: 'Partial footprint · 0.25 m/px', icon: '▧', available: true, sceneId: 'hirise-jezero' },
  { id: 'global-mosaic', label: 'Mars global mosaic', detail: 'NASA Viking · 232 m/px', icon: '◉', available: true, sceneId: 'mars-viking-global' },
  { id: 'hazards', label: 'Terrain hazards', detail: 'Hazard mapping', icon: '△', available: false },
  { id: 'geology', label: 'Geological composition', detail: 'Mineral & unit data', icon: '◈', available: false },
  { id: 'water', label: 'Water resources', detail: 'Hydration indicators', icon: '≈', available: false },
  { id: 'environment', label: 'Environmental conditions', detail: 'Surface conditions', icon: '☼', available: false },
  { id: 'routes', label: 'Exploration routes', detail: 'Route planning', icon: '⌖', available: true },
];
