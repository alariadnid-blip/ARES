# ARES — Mars Surface Operations

ARES (Astronautic Reconnaissance & Exploration System) is a React + Vite foundation for exploring Jezero Crater. The current map is an explicitly labeled placeholder canvas. It contains no NASA imagery, derived terrain, or scientific overlay data.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and run static analysis with `npm run lint`.

## Structure

- `src/components/` — header, layer controls, OpenLayers map, location details, and map status.
- `src/data/layers.js` — layer catalog and availability flags. Only the placeholder base canvas is enabled.
- `src/map/marsProjection.js` — temporary local display projection and Proj4/OpenLayers registration helper for the mission CRS.
- `src/styles/global.css` — responsive mission-control layout and map placeholder styling.

`MapView` accepts an OpenLayers projection, initial center and zoom, and map layers. When the mission team supplies the authoritative CRS definition, coordinate extent, and map origin, call `configureMarsProjection({ code, definition, extent, units })`, then pass its returned projection and the matching center/data layers to `MapView`. Until then, coordinate readouts are explicitly canvas-pixel coordinates, and geographic scale remains unavailable.

## Region reference

The information panel uses approximate Jezero Crater context from NASA/JPL: about 18° north, 77° east; roughly 45 km across; western Isidis Planitia; and an ancient lake/delta setting. These region facts are not used to georeference the placeholder canvas.
