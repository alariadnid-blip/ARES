import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import View from 'ol/View.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import Modify from 'ol/interaction/Modify.js';
import { transform } from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import RegularShape from 'ol/style/RegularShape.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import TextStyle from 'ol/style/Text.js';
import { conceptSciencePoints } from '../data/explorationRoutes.js';
import { MARS_GEOGRAPHIC, getSceneProjection } from '../map/sceneProjections.js';
import { namedMarsCraters, normalizeMarsLongitude, perseveranceLandingSite } from '../data/marsFeatures.js';
import { PLACEHOLDER_PROJECTION } from '../map/marsProjection.js';
import useDragPosition from '../hooks/useDragPosition.js';
import MapTools from './MapTools.jsx';
import GlobeView from './GlobeView.jsx';
import 'ol/ol.css';

const EMPTY_LAYERS = [];
const ORIGIN = [0, 0];
const MARS_RADIUS_METERS = 3396190;

function mapFeatureStyle(feature) {
  if (feature.get('featureType') === 'measurement') {
    return new Style({
      stroke: new Stroke({ color: '#73eee5', width: 3, lineDash: [10, 7] }),
      text: new TextStyle({
        text: feature.get('distanceLabel'),
        placement: 'point',
        font: '600 12px "Segoe UI", sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: '#14152c', width: 4 }),
        backgroundFill: new Fill({ color: '#17183ddd' }),
        padding: [5, 7, 5, 7],
      }),
    });
  }
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#ffab48' }),
      stroke: new Stroke({ color: '#fff5dc', width: 2 }),
    }),
    text: new TextStyle({
      text: feature.get('label'),
      offsetY: -21,
      font: '700 11px "Segoe UI", sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#12142b', width: 4 }),
      backgroundFill: new Fill({ color: '#17183de8' }),
      padding: [3, 5, 3, 5],
    }),
  });
}

function createGeodesicRing(location, projection) {
  const angularRadius = (location.diameterKm * 500) / MARS_RADIUS_METERS;
  const latitude = location.latitude * Math.PI / 180;
  const longitude = normalizeMarsLongitude(location.longitudeEast) * Math.PI / 180;
  const coordinates = [];
  for (let index = 0; index <= 72; index += 1) {
    const bearing = index / 72 * Math.PI * 2;
    const nextLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularRadius)
      + Math.cos(latitude) * Math.sin(angularRadius) * Math.cos(bearing),
    );
    const nextLongitude = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latitude),
      Math.cos(angularRadius) - Math.sin(latitude) * Math.sin(nextLatitude),
    );
    coordinates.push(transform(
      [nextLongitude * 180 / Math.PI, nextLatitude * 180 / Math.PI],
      MARS_GEOGRAPHIC,
      projection,
    ));
  }
  return new Polygon([coordinates]);
}

function namedFeatureStyle(feature) {
  const featureType = feature.get('featureType');
  if (featureType === 'crater-outline') {
    return new Style({
      fill: new Fill({ color: '#ffb34713' }),
      stroke: new Stroke({ color: '#ffc66c', width: 2.25 }),
      zIndex: 1,
    });
  }

  const isJezero = feature.get('name') === 'Jezero';
  const isLandingSite = featureType === 'landing-site';
  const label = isJezero ? 'JEZERO CRATER' : isLandingSite ? 'PERSEVERANCE LANDING SITE' : feature.get('name');
  const icon = isLandingSite
    ? new RegularShape({ points: 4, radius: 7, angle: Math.PI / 4, fill: new Fill({ color: '#62eee2' }), stroke: new Stroke({ color: '#ffffff', width: 1.8 }) })
    : new CircleStyle({
      radius: isJezero ? 6 : 3.5,
      fill: new Fill({ color: isJezero ? '#ffaf54' : '#edf4ff' }),
      stroke: new Stroke({ color: isJezero ? '#fff3d5' : '#111a2d', width: isJezero ? 2 : 1.6 }),
    });

  return new Style({
    image: icon,
    text: new TextStyle({
      text: label,
      offsetX: isLandingSite ? 12 : isJezero ? 8 : 0,
      offsetY: isLandingSite ? 16 : feature.get('labelOffsetY') ?? -14,
      textAlign: isLandingSite ? 'left' : 'center',
      font: isLandingSite ? '700 9px "Segoe UI", sans-serif' : isJezero ? '700 11px "Segoe UI", sans-serif' : '600 10px "Segoe UI", sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#070b16', width: 3.4 }),
      backgroundFill: new Fill({ color: isJezero ? '#21160fe8' : isLandingSite ? '#081c24ed' : '#080d1bdc' }),
      padding: [3, 5, 3, 5],
    }),
  });
}

const ROUTE_COLORS = { primary: '#ffd24a', 'alternative-a': '#58d9ee', 'alternative-b': '#b796ff', custom: '#ff9d62' };

function routeLineStyle(feature) {
  const color = ROUTE_COLORS[feature.get('routeId')] ?? ROUTE_COLORS.custom;
  if (feature.get('featureType') === 'route-direction') {
    return new Style({ image: new RegularShape({ points: 3, radius: 6, rotation: feature.get('angle') - Math.PI / 2, fill: new Fill({ color }), stroke: new Stroke({ color: '#11172b', width: 1.5 }) }) });
  }
  return new Style({
    stroke: new Stroke({ color, width: feature.get('routeId') === 'primary' ? 4 : 3, lineDash: feature.get('routeId') === 'primary' ? undefined : [10, 7] }),
    text: new TextStyle({ text: feature.get('name') ?? '', placement: 'line', repeat: true, font: '700 10px "Segoe UI", sans-serif', fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#11172b', width: 4 }) }),
  });
}

function routeWaypointStyle(feature) {
  const color = feature.get('isStart') ? '#54e4ba' : feature.get('isDestination') ? '#ffba56' : '#f7f8ff';
  return new Style({
    image: new CircleStyle({ radius: feature.get('selected') ? 10 : 7, fill: new Fill({ color }), stroke: new Stroke({ color: '#11172b', width: 2.5 }) }),
    text: new TextStyle({ text: feature.get('sequence') ? String(feature.get('sequence')) : '', font: '700 9px "Segoe UI", sans-serif', fill: new Fill({ color: '#11172b' }) }),
  });
}

function sciencePointStyle(feature) {
  return new Style({
    image: new RegularShape({ points: 4, radius: 7, angle: Math.PI / 4, fill: new Fill({ color: '#bd9cff' }), stroke: new Stroke({ color: '#fff', width: 1.5 }) }),
    text: new TextStyle({ text: feature.get('name'), offsetY: -14, font: '600 10px "Segoe UI", sans-serif', fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#080d1b', width: 3 }) }),
  });
}

function zoneStyle(feature) {
  const styles = { safe: ['#49d19b35', '#49d19b'], caution: ['#ffbf3b38', '#ffc04c'], hazard: ['#f3595c38', '#ff6666'] };
  const [fill, stroke] = styles[feature.get('classification')] ?? styles.caution;
  return new Style({ fill: new Fill({ color: fill }), stroke: new Stroke({ color: stroke, width: 2, lineDash: [7, 5] }) });
}

function createNamedFeatures(scene, projection) {
  if (scene.kind === 'placeholder') return [];
  const features = [];
  const addNamedPoint = (location, type = 'crater') => {
    const geographic = [normalizeMarsLongitude(location.longitudeEast), location.latitude];
    const coordinate = transform(geographic, MARS_GEOGRAPHIC, projection);
    const [minX, minY, maxX, maxY] = scene.extent;
    if (coordinate[0] < minX || coordinate[0] > maxX || coordinate[1] < minY || coordinate[1] > maxY) return;

    const feature = new Feature({
      geometry: new Point(coordinate),
      featureType: type === 'landing-site' ? 'landing-site' : 'named-crater',
      name: location.name,
      latitude: location.latitude,
      longitudeEast: location.longitudeEast,
      diameterKm: location.diameterKm,
      labelOffsetY: location.labelOffsetY,
      typeLabel: location.type,
      sourceUrl: location.sourceUrl,
    });
    features.push(feature);

    if (String(location.id) === '14300') {
      features.unshift(new Feature({
        geometry: createGeodesicRing(location, projection),
        featureType: 'crater-outline',
        name: location.name,
        latitude: location.latitude,
        longitudeEast: location.longitudeEast,
        diameterKm: location.diameterKm,
        typeLabel: location.type,
        sourceUrl: location.sourceUrl,
      }));
    }
  };

  namedMarsCraters.forEach((crater) => addNamedPoint(crater));
  addNamedPoint(perseveranceLandingSite, 'landing-site');
  return features;
}

function fitResolution(extent, size) {
  if (!extent || !size || size[0] < 32 || size[1] < 32) return null;
  return Math.max((extent[2] - extent[0]) / size[0], (extent[3] - extent[1]) / size[1]) * 1.08;
}

function formatMapResolution(scene, resolution, centerLatitude) {
  if (scene.kind === 'placeholder' || !Number.isFinite(resolution)) return 'Unavailable';
  if (scene.coordinateUnits === '°') {
    const metersPerDegree = (Math.PI * 3396190) / 180;
    const latitude = Number.isFinite(centerLatitude) ? centerLatitude : (scene.center?.[1] ?? 0);
    const latitudeScale = Math.cos((latitude * Math.PI) / 180);
    return `~${Math.round(resolution * metersPerDegree * latitudeScale)} m/px`;
  }
  return `${resolution < 1 && scene.pixelUnits === '°/px' ? resolution.toFixed(5) : Math.round(resolution)} ${scene.pixelUnits}`;
}

export default function MapView({
  scene,
  detailsOpen,
  onCursorChange,
  onSelectPoint,
  onPlaceMarker,
  onRulerPick,
  onMapStatus,
  onScaleChange,
  layers = EMPTY_LAYERS,
  markers = [],
  mapTool = 'inspect',
  pendingRulerIds = [],
  measurement = null,
  toolMessage = '',
  onSetMapTool,
  onRemoveMarker,
  onClearMarkers,
  onClearRuler,
  routes = [],
  customRoutePoints = [],
  routeVisibility = {},
  overlayVisibility = {},
  selectedRouteId = 'primary',
  onAddRouteWaypoint,
  onMoveRouteWaypoint,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerSourceRef = useRef(null);
  const routeSourcesRef = useRef(null);
  const routeLayersRef = useRef(null);
  const modifyInteractionRef = useRef(null);
  const handlersRef = useRef({});
  const enterGlobeRef = useRef(() => {});
  const selectedGlobePoint = useRef(null);
  const fitResolutionRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [resolution, setResolution] = useState(1);
  const [canvasView, setCanvasView] = useState({ scale: 1, x: 0, y: 0 });
  const [globeMode, setGlobeMode] = useState(true);
  const [globeScale, setGlobeScale] = useState(1);
  const [orientationResetKey, setOrientationResetKey] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { ref: toolbarRef, style: toolbarStyle, dragging: toolbarDragging, dragHandleProps: toolbarDragProps } = useDragPosition();
  const { ref: navigationRef, style: navigationStyle, dragging: navigationDragging, dragHandleProps: navigationDragProps } = useDragPosition();
  useLayoutEffect(() => {
    handlersRef.current = { mapTool, onCursorChange, onSelectPoint, onPlaceMarker, onRulerPick, onAddRouteWaypoint, onMoveRouteWaypoint };
    modifyInteractionRef.current?.setActive(mapTool === 'route-edit');
  }, [mapTool, onCursorChange, onSelectPoint, onPlaceMarker, onRulerPick, onAddRouteWaypoint, onMoveRouteWaypoint]);

  const enterGlobe = useCallback(() => {
    mapInstance.current?.getView().cancelAnimations();
    setGlobeMode(true);
    setGlobeScale(1);
    onMapStatus('Mars globe view');
    onScaleChange('Planetary view');
  }, [onMapStatus, onScaleChange]);
  useLayoutEffect(() => {
    enterGlobeRef.current = enterGlobe;
  }, [enterGlobe]);

  const enterRasterView = useCallback(() => {
    const map = mapInstance.current;
    const view = map?.getView();
    if (!map || !view) return;
    map.updateSize();
    const fit = fitResolution(scene.extent, map.getSize());
    if (fit !== null) {
      fitResolutionRef.current = fit;
    }
    let center = scene.center ?? ORIGIN;
    if (scene.kind !== 'placeholder' && scene.id === 'mars-global' && selectedGlobePoint.current) {
      const { latitude, longitude } = selectedGlobePoint.current;
      center = transform([((longitude + 540) % 360) - 180, latitude], MARS_GEOGRAPHIC, getSceneProjection(scene.projectionCode));
    }
    if (scene.kind === 'placeholder') {
      setGlobeMode(false);
      view.setCenter(ORIGIN);
      view.setZoom(1);
    } else {
      view.cancelAnimations();
      setGlobeMode(false);
      view.animate({ center, resolution: fitResolutionRef.current * 0.78, duration: 780, easing: (fraction) => 1 - (1 - fraction) ** 4 });
    }
    if (scene.id !== 'mars-global') onSelectPoint(null);
    setGlobeScale(1);
  }, [onSelectPoint, scene]);

  useEffect(() => {
    if (mapTool === 'route-edit' && globeMode) enterRasterView();
  }, [enterRasterView, globeMode, mapTool]);

  const handleGlobePick = useCallback(({ latitude, longitude }) => {
    const projection = scene.kind === 'placeholder' ? null : getSceneProjection(scene.projectionCode);
    const normalizedLongitude = ((longitude + 540) % 360) - 180;
    const coordinate = projection ? transform([normalizedLongitude, latitude], MARS_GEOGRAPHIC, projection) : [normalizedLongitude, latitude];
    const point = {
      latitude,
      longitude: scene.longitudeConvention === 'east360' && longitude < 0 ? longitude + 360 : longitude,
      x: coordinate[0],
      y: coordinate[1],
      coordinate,
    };
    selectedGlobePoint.current = { latitude, longitude };
    const handlers = handlersRef.current;
    if (handlers.mapTool === 'marker') handlers.onPlaceMarker?.(point);
    else if (handlers.mapTool === 'inspect') handlers.onSelectPoint?.(point);
    else onMapStatus('Select markers on the globe to measure their distance');
  }, [onMapStatus, scene]);

  const handleGlobeCursor = useCallback((position) => {
    if (!position) {
      onCursorChange(null);
      return;
    }
    onCursorChange({
      ...position,
      longitude: scene.longitudeConvention === 'east360' && position.longitude < 0 ? position.longitude + 360 : position.longitude,
    });
  }, [onCursorChange, scene.longitudeConvention]);

  useEffect(() => {
    const mapTarget = mapElement.current;
    if (!mapTarget) return undefined;

    const isRaster = scene.kind !== 'placeholder';
    const projection = isRaster ? getSceneProjection(scene.projectionCode) : PLACEHOLDER_PROJECTION;
    let rasterSource = null;
    let rasterEventHandlers = [];
    let cancelled = false;
    let hasInitialRasterFit = false;
    const view = new View({
      projection,
      center: scene.center ?? ORIGIN,
      ...(isRaster ? { resolution: 1, minZoom: 0, maxZoom: scene.maxZoom ?? 24 } : { zoom: 1, minZoom: 0, maxZoom: 8, extent: [-2000, -1500, 2000, 1500] }),
    });
    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({ source: markerSource, style: mapFeatureStyle, declutter: true });
    markerLayer.setZIndex(1000);
    const namedFeatureSource = new VectorSource({ features: createNamedFeatures(scene, projection) });
    const namedFeatureLayer = new VectorLayer({ source: namedFeatureSource, style: namedFeatureStyle, declutter: true });
    namedFeatureLayer.setZIndex(20);
    const routeIds = ['primary', 'alternative-a', 'alternative-b', 'custom'];
    const routeLineSources = Object.fromEntries(routeIds.map((routeId) => [routeId, new VectorSource()]));
    const routeLineLayers = Object.fromEntries(routeIds.map((routeId, index) => {
      const layer = new VectorLayer({ source: routeLineSources[routeId], style: routeLineStyle, declutter: true });
      layer.setZIndex(30 + index);
      return [routeId, layer];
    }));
    const routeWaypointSource = new VectorSource();
    const routeWaypointLayer = new VectorLayer({ source: routeWaypointSource, style: routeWaypointStyle, declutter: true });
    routeWaypointLayer.setZIndex(42);
    const customWaypointSource = new VectorSource();
    const customWaypointLayer = new VectorLayer({ source: customWaypointSource, style: routeWaypointStyle, declutter: true });
    customWaypointLayer.setZIndex(43);
    const scienceSource = new VectorSource();
    const scienceLayer = new VectorLayer({ source: scienceSource, style: sciencePointStyle, declutter: true });
    scienceLayer.setZIndex(45);
    const photoSource = new VectorSource();
    const photoLayer = new VectorLayer({ source: photoSource, style: sciencePointStyle, declutter: true });
    photoLayer.setZIndex(46);
    const zoneSources = Object.fromEntries(['safe', 'caution', 'hazard'].map((zoneId) => [zoneId, new VectorSource()]));
    const zoneLayers = Object.fromEntries(['safe', 'caution', 'hazard'].map((zoneId, index) => {
      const layer = new VectorLayer({ source: zoneSources[zoneId], style: zoneStyle });
      layer.setZIndex(25 + index);
      return [zoneId, layer];
    }));
    routeSourcesRef.current = { lines: routeLineSources, waypoints: routeWaypointSource, customWaypoints: customWaypointSource, science: scienceSource, photos: photoSource, zones: zoneSources };
    routeLayersRef.current = { lines: routeLineLayers, waypoints: routeWaypointLayer, customWaypoints: customWaypointLayer, science: scienceLayer, photos: photoLayer, zones: zoneLayers };
    markerSourceRef.current = markerSource;
    const map = new Map({
      target: mapTarget,
      layers: [...layers, ...Object.values(zoneLayers), ...Object.values(routeLineLayers), namedFeatureLayer, scienceLayer, photoLayer, routeWaypointLayer, customWaypointLayer, markerLayer],
      view,
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
      controls: [],
    });
    mapInstance.current = map;

    const toGeographic = (coordinate) => {
      if (!isRaster) return null;
      let [longitude, latitude] = transform(coordinate, projection, MARS_GEOGRAPHIC);
      if (scene.longitudeConvention === 'east360' && longitude < 0) longitude += 360;
      return { latitude, longitude };
    };
    const modifyInteraction = new Modify({ source: customWaypointSource, pixelTolerance: 14 });
    modifyInteraction.setActive(false);
    modifyInteraction.on('modifyend', (event) => {
      event.features.forEach((feature) => {
        const geographic = toGeographic(feature.getGeometry().getCoordinates());
        if (geographic) handlersRef.current.onMoveRouteWaypoint?.(feature.get('waypointId'), geographic);
      });
    });
    map.addInteraction(modifyInteraction);
    modifyInteractionRef.current = modifyInteraction;
    map.on('singleclick', (event) => {
      const point = { x: event.coordinate[0], y: event.coordinate[1], coordinate: [...event.coordinate], ...toGeographic(event.coordinate) };
      const handlers = handlersRef.current;
      if (handlers.mapTool === 'route-edit') {
        handlers.onAddRouteWaypoint?.(point);
        return;
      }
      if (handlers.mapTool === 'marker') {
        handlers.onPlaceMarker?.(point);
        return;
      }
      if (handlers.mapTool === 'ruler') {
        const marker = map.forEachFeatureAtPixel(event.pixel, (feature, layer) => layer === markerLayer && feature.get('featureType') === 'marker' ? feature : undefined);
        if (marker) handlers.onRulerPick?.(marker.get('markerId'));
        return;
      }
      const routeFeature = map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (layer === routeWaypointLayer || layer === customWaypointLayer || layer === scienceLayer || layer === photoLayer) return feature;
        if (Object.values(routeLineLayers).includes(layer) && feature.get('featureType') === 'route-line') return feature;
        return undefined;
      }, { hitTolerance: 6 });
      if (routeFeature) {
        const featureType = routeFeature.get('featureType');
        const routeItemType = featureType === 'science-point' ? 'science-point' : featureType === 'rover-photo' ? 'rover-photo' : featureType === 'route-line' ? 'route' : 'waypoint';
        const featureGeometry = routeFeature.getGeometry();
        const featureCoordinate = featureGeometry.getType() === 'Point' ? featureGeometry.getCoordinates() : event.coordinate;
        handlers.onSelectPoint?.({
          x: featureCoordinate[0],
          y: featureCoordinate[1],
          coordinate: featureCoordinate,
          latitude: routeFeature.get('latitude') ?? toGeographic(featureCoordinate)?.latitude,
          longitude: routeFeature.get('longitude') ?? toGeographic(featureCoordinate)?.longitude,
          routeItemType,
          waypointId: routeFeature.get('waypointId'),
          id: routeFeature.get('waypointId') ?? routeFeature.get('id'),
          routeId: routeFeature.get('routeId'),
          routeName: routeFeature.get('routeName'),
          routeType: routeFeature.get('routeType'),
          sequence: routeFeature.get('sequence'),
          name: routeFeature.get('name') ?? routeFeature.get('routeName'),
          description: routeFeature.get('description'),
          source: routeFeature.get('source'),
          sourceUrl: routeFeature.get('sourceUrl'),
          verified: routeFeature.get('verified'),
          isCustom: routeFeature.get('isCustom'),
          points: routeFeature.get('routePoints'),
          photo: routeFeature.get('photo'),
        });
        return;
      }
      const namedFeature = map.forEachFeatureAtPixel(event.pixel, (feature, layer) => (
        layer === namedFeatureLayer && ['named-crater', 'landing-site'].includes(feature.get('featureType')) ? feature : undefined
      ));
      if (namedFeature) {
        const featureCoordinate = namedFeature.getGeometry().getType() === 'Point'
          ? namedFeature.getGeometry().getCoordinates()
          : transform(
            [normalizeMarsLongitude(namedFeature.get('longitudeEast')), namedFeature.get('latitude')],
            MARS_GEOGRAPHIC,
            projection,
          );
        handlers.onSelectPoint?.({
          x: featureCoordinate[0],
          y: featureCoordinate[1],
          coordinate: featureCoordinate,
          latitude: namedFeature.get('latitude'),
          longitude: namedFeature.get('longitudeEast'),
          featureName: namedFeature.get('name'),
          featureType: namedFeature.get('typeLabel'),
          featureDiameterKm: namedFeature.get('diameterKm'),
          featureSourceUrl: namedFeature.get('sourceUrl'),
        });
        return;
      }
      handlers.onSelectPoint?.(point);
    });
    map.on('pointermove', (event) => {
      if (event.dragging) return;
      handlersRef.current.onCursorChange?.({ x: event.coordinate[0], y: event.coordinate[1], ...toGeographic(event.coordinate) });
    });

    const handleWheelAtWorldLimit = (event) => {
      if (event.deltaY <= 0 || view.getResolution() < fitResolutionRef.current * 0.995) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      enterGlobeRef.current();
    };
    mapTarget.addEventListener('wheel', handleWheelAtWorldLimit, { capture: true, passive: false });

    map.updateSize();
    const updateViewReadout = () => {
      const currentResolution = view.getResolution() ?? 1;
      setZoom(view.getZoom() ?? 1);
      setResolution(currentResolution);
      onScaleChange(formatMapResolution(scene, currentResolution, view.getCenter()?.[1]));
      if (!isRaster) {
        const originPixel = map.getPixelFromCoordinate(ORIGIN);
        if (originPixel) setCanvasView({ scale: Math.min(2, Math.max(0.65, 1 / currentResolution)), x: originPixel[0], y: originPixel[1] });
      }
    };

    if (isRaster) {
      const initialFit = fitResolution(scene.extent, map.getSize());
      if (initialFit !== null) {
        fitResolutionRef.current = initialFit;
        view.setResolution(initialFit);
        hasInitialRasterFit = true;
      }
      onMapStatus('Loading raster');
      const layerPromise = scene.kind === 'image'
        ? import('../map/createStaticRasterLayer.js').then(({ createStaticRasterLayer }) => createStaticRasterLayer(scene, projection))
        : scene.kind === 'geotiff'
          ? import('../map/createGeoTiffLayer.js').then(({ createGeoTiffLayer }) => createGeoTiffLayer(scene, projection))
          : import('../map/createWmtsRasterLayer.js').then(({ createWmtsRasterLayer }) => createWmtsRasterLayer(scene, projection));
      layerPromise.then((raster) => {
        if (cancelled) return;
        rasterSource = raster.source;
        if (scene.kind === 'wmts') {
          let pendingTiles = 0;
          const handleTileStart = () => {
            pendingTiles += 1;
            onMapStatus('Loading map tiles');
          };
          const handleTileEnd = () => {
            pendingTiles = Math.max(0, pendingTiles - 1);
            if (pendingTiles === 0) onMapStatus('Raster ready');
          };
          const handleTileError = () => onMapStatus('Raster tile error');
          rasterSource.on('tileloadstart', handleTileStart);
          rasterSource.on('tileloadend', handleTileEnd);
          rasterSource.on('tileloaderror', handleTileError);
          rasterEventHandlers = [['tileloadstart', handleTileStart], ['tileloadend', handleTileEnd], ['tileloaderror', handleTileError]];
          map.addLayer(raster.layer);
          if (pendingTiles === 0) onMapStatus('Loading map tiles');
          return;
        }
        let pendingGeoTiffTiles = 0;
        let loadedGeoTiffTiles = 0;
        let failedGeoTiffTiles = 0;
        const handleGeoTiffTileStart = () => {
          pendingGeoTiffTiles += 1;
          onMapStatus('Loading GeoTIFF tiles');
        };
        const handleGeoTiffTileEnd = () => {
          pendingGeoTiffTiles = Math.max(0, pendingGeoTiffTiles - 1);
          loadedGeoTiffTiles += 1;
          if (pendingGeoTiffTiles === 0 && failedGeoTiffTiles === 0) onMapStatus('GeoTIFF ready');
        };
        const handleGeoTiffTileError = () => {
          pendingGeoTiffTiles = Math.max(0, pendingGeoTiffTiles - 1);
          failedGeoTiffTiles += 1;
          onMapStatus('GeoTIFF tile error');
        };
        if (scene.kind === 'geotiff') {
          rasterSource.on('tileloadstart', handleGeoTiffTileStart);
          rasterSource.on('tileloadend', handleGeoTiffTileEnd);
          rasterSource.on('tileloaderror', handleGeoTiffTileError);
          rasterEventHandlers = [['tileloadstart', handleGeoTiffTileStart], ['tileloadend', handleGeoTiffTileEnd], ['tileloaderror', handleGeoTiffTileError]];
        }
        const updateRasterStatus = () => {
          if (rasterSource.getState() === 'ready') {
            if (scene.kind === 'geotiff') {
              if (failedGeoTiffTiles > 0) onMapStatus('GeoTIFF tile error');
              else if (loadedGeoTiffTiles > 0 && pendingGeoTiffTiles === 0) onMapStatus('GeoTIFF ready');
              else onMapStatus('Loading GeoTIFF tiles');
            } else onMapStatus('Raster ready');
          }
          if (rasterSource.getState() === 'error') onMapStatus('Raster load error');
        };
        const markImageReady = () => onMapStatus('Raster ready');
        const markImageError = () => onMapStatus('Raster load error');
        if (scene.kind === 'image') {
          rasterSource.on('imageloadend', markImageReady);
          rasterSource.on('imageloaderror', markImageError);
          rasterEventHandlers = [['imageloadend', markImageReady], ['imageloaderror', markImageError]];
        } else {
          rasterSource.on('change', updateRasterStatus);
          rasterEventHandlers = [['change', updateRasterStatus]];
        }
        if (raster.fallbackLayer) map.addLayer(raster.fallbackLayer);
        map.addLayer(raster.layer);
        updateRasterStatus();
      }).catch(() => {
        if (!cancelled) onMapStatus('Raster load error');
      });
    } else {
      onMapStatus('Placeholder mode');
    }

    view.on('change:resolution', updateViewReadout);
    view.on('change:center', updateViewReadout);
    map.on('change:size', updateViewReadout);
    const handleResize = () => {
      map.updateSize();
      if (isRaster) {
        const currentFit = fitResolution(scene.extent, map.getSize());
        if (currentFit !== null) {
          fitResolutionRef.current = currentFit;
          if (!hasInitialRasterFit) {
            view.setResolution(currentFit);
            hasInitialRasterFit = true;
          }
        }
      }
      updateViewReadout();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mapElement.current);
    window.addEventListener('resize', handleResize);
    updateViewReadout();

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      mapTarget.removeEventListener('wheel', handleWheelAtWorldLimit, true);
      if (rasterSource) rasterEventHandlers.forEach(([event, handler]) => rasterSource.un(event, handler));
      map.setTarget(undefined);
      mapInstance.current = null;
      markerSourceRef.current = null;
      routeSourcesRef.current = null;
      routeLayersRef.current = null;
      modifyInteractionRef.current = null;
    };
  }, [layers, onCursorChange, onMapStatus, onScaleChange, onSelectPoint, scene]);

  useEffect(() => {
    const sources = routeSourcesRef.current;
    const routeLayers = routeLayersRef.current;
    if (!sources || !routeLayers || scene.kind === 'placeholder') return;
    const projection = getSceneProjection(scene.projectionCode);
    const toMapCoordinate = (point) => transform([normalizeMarsLongitude(point.longitude), point.latitude], MARS_GEOGRAPHIC, projection);
    const allRoutes = [...routes, { id: 'custom', name: 'My custom route', type: 'custom', status: 'custom', source: 'ARES user-created route.', points: customRoutePoints }];
    const routeById = new Map(allRoutes.map((route) => [route.id, route]));

    Object.entries(sources.lines).forEach(([routeId, source]) => {
      const route = routeById.get(routeId);
      const isVisible = Boolean(routeVisibility[routeId]);
      const features = [];
      if (route && isVisible && route.points.length) {
        const coordinates = route.points.map(toMapCoordinate);
        if (coordinates.length >= 2) {
          features.push(new Feature({
            geometry: new LineString(coordinates),
            featureType: 'route-line',
            routeId,
            routeName: route.name,
            routeType: route.type,
            name: route.name,
            routePoints: route.points,
            description: route.description,
            source: route.source,
          }));
          coordinates.slice(1).forEach((coordinate, index) => {
            const previous = coordinates[index];
            features.push(new Feature({
              geometry: new Point([(previous[0] + coordinate[0]) / 2, (previous[1] + coordinate[1]) / 2]),
              featureType: 'route-direction',
              routeId,
              angle: Math.atan2(coordinate[1] - previous[1], coordinate[0] - previous[0]),
            }));
          });
        }
      }
      source.clear(true);
      source.addFeatures(features);
      routeLayers.lines[routeId].setVisible(isVisible);
    });

    const routeWaypoints = routes.flatMap((route) => routeVisibility[route.id] ? route.points.map((point, index) => ({
      ...point,
      routeName: route.name,
      routeType: route.type,
      routePoints: route.points,
      sequence: index + 1,
      isStart: index === 0,
      isDestination: index === route.points.length - 1,
    })) : []);
    const waypointFeatures = routeWaypoints.map((point) => new Feature({
      geometry: new Point(toMapCoordinate(point)),
      featureType: 'route-waypoint',
      waypointId: point.id,
      routeId: point.routeId,
      routeName: point.routeName,
      routeType: point.routeType,
      routePoints: point.routePoints,
      sequence: point.sequence,
      name: point.name,
      description: point.description,
      source: point.source ?? (point.verified ? 'NASA Perseverance landing site reference.' : 'User-supplied ARES concept map; approximate coordinate.'),
      sourceUrl: point.sourceUrl,
      verified: Boolean(point.verified),
      isStart: point.isStart,
      isDestination: point.isDestination,
    }));
    sources.waypoints.clear(true);
    sources.waypoints.addFeatures(waypointFeatures);
    routeLayers.waypoints.setVisible(Boolean(overlayVisibility.waypoints ?? true));

    const customFeatures = customRoutePoints.map((point, index) => {
      const feature = new Feature({
        geometry: new Point(toMapCoordinate(point)),
        featureType: 'route-waypoint',
        waypointId: point.id,
        routeId: 'custom',
        routeName: 'My custom route',
        routeType: 'custom',
        routePoints: customRoutePoints,
        sequence: index + 1,
        name: point.name || `Waypoint ${index + 1}`,
        description: 'User-created Mars coordinate; terrain classification is unknown.',
        source: 'ARES user-created planning coordinate.',
        verified: false,
        isCustom: true,
        isStart: index === 0,
        isDestination: index === customRoutePoints.length - 1,
      });
      feature.setId(point.id);
      return feature;
    });
    sources.customWaypoints.clear(true);
    sources.customWaypoints.addFeatures(customFeatures);
    routeLayers.customWaypoints.setVisible(Boolean(overlayVisibility.waypoints ?? true) && Boolean(routeVisibility.custom));

    const scienceFeatures = conceptSciencePoints.map((point) => new Feature({
      geometry: new Point(toMapCoordinate(point)),
      featureType: 'science-point',
      waypointId: point.id,
      id: point.id,
      name: point.name,
      latitude: point.latitude,
      longitude: point.longitude,
      description: point.description,
      significance: point.significance,
      source: point.source,
      routeItemType: 'science-point',
      verified: false,
    }));
    sources.science.clear(true);
    sources.science.addFeatures(scienceFeatures);
    routeLayers.science.setVisible(Boolean(overlayVisibility.science));
    routeLayers.photos.setVisible(Boolean(overlayVisibility.photos));
    Object.entries(routeLayers.zones).forEach(([zoneId, layer]) => layer.setVisible(Boolean(overlayVisibility[zoneId])));
  }, [customRoutePoints, overlayVisibility, routeVisibility, routes, scene]);

  useEffect(() => {
    const source = markerSourceRef.current;
    if (!source) return;
    const markerFeatures = markers
      .filter((marker) => marker.sceneId === scene.id)
      .map((marker) => {
        const feature = new Feature({ geometry: new Point(marker.coordinate), featureType: 'marker', markerId: marker.id, label: marker.label });
        feature.setId(marker.id);
        return feature;
      });
    const byId = new Map(markers.map((marker) => [marker.id, marker]));
    const start = measurement ? byId.get(measurement.fromId) : null;
    const end = measurement ? byId.get(measurement.toId) : null;
    const rulerFeature = start && end && start.sceneId === scene.id && end.sceneId === scene.id
      ? new Feature({
        geometry: new LineString([start.coordinate, end.coordinate]),
        featureType: 'measurement',
        distanceLabel: `${measurement.distanceKm.toFixed(measurement.distanceKm < 10 ? 2 : 1)} km`,
      })
      : null;
    source.clear(true);
    source.addFeatures(rulerFeature ? [rulerFeature, ...markerFeatures] : markerFeatures);
  }, [markers, measurement, scene.id]);

  useEffect(() => {
    modifyInteractionRef.current?.setActive(mapTool === 'route-edit');
  }, [mapTool]);

  const adjustZoom = (delta) => {
    if (globeMode) {
      if (delta > 0) enterRasterView();
      else setGlobeScale((current) => Math.max(0.57, current - 0.08));
      return;
    }
    const view = mapInstance.current?.getView();
    if (!view) return;
    if (delta < 0 && (view.getResolution() ?? 0) >= fitResolutionRef.current * 0.995) {
      enterGlobe();
      return;
    }
    view.animate({ zoom: Math.max(0, Math.min(scene.maxZoom ?? 24, (view.getZoom() ?? 1) + delta)), duration: 180 });
  };

  const resetView = () => {
    if (globeMode) {
      setGlobeScale(1);
      setOrientationResetKey((current) => current + 1);
      onSelectPoint(null);
      return;
    }
    const map = mapInstance.current;
    const view = map?.getView();
    if (!map || !view) return;
    view.cancelAnimations();
    view.setCenter(scene.center ?? ORIGIN);
    if (scene.kind !== 'placeholder') {
      map.updateSize();
      const currentFit = fitResolution(scene.extent, map.getSize());
      if (currentFit !== null) fitResolutionRef.current = currentFit;
      view.setResolution(fitResolutionRef.current);
    } else {
      view.setZoom(1);
    }
    view.setRotation(0);
    onSelectPoint(null);
  };

  const isRaster = scene.kind !== 'placeholder';
  const resolutionLabel = formatMapResolution(scene, resolution);

  return (
    <section className="map-frame" aria-label="Interactive Mars map">
      <div ref={toolbarRef} style={toolbarStyle} className={`map-toolbar floating-map-control ${toolbarDragging ? 'is-dragging' : ''}`} {...toolbarDragProps}>
        <div className="map-title"><span className="toolbar-drag-grip" aria-hidden="true">⠿</span><span className="map-pin">⌖</span><div><span className="eyebrow">EXPLORATION VIEW</span><strong>{scene.title}</strong></div></div>
        <div className="map-toolbar-right">
          <span className="projection-badge"><i /> {globeMode ? 'GLOBAL · NASA MOLA + HRSC' : isRaster ? `NATIVE · ${scene.pixelUnits}` : 'PROJECTION PENDING'}</span>
          <button type="button" className={`map-action map-tools-toggle ${toolsOpen ? 'active' : ''}`} onClick={() => setToolsOpen((open) => !open)} aria-expanded={toolsOpen} aria-controls="map-tools-panel"><span aria-hidden="true">⌖</span> Tools</button>
          {!globeMode && <button type="button" className="map-action globe-return-button" onClick={enterGlobe} title="Return to the interactive Mars globe"><span aria-hidden="true">◉</span> Globe</button>}
          <button type="button" className="map-action" onClick={resetView} title={globeMode ? 'Reset globe orientation' : 'Center active map scene'}><span aria-hidden="true">⌖</span> {globeMode ? 'Orient' : 'Recenter'}</button>
        </div>
      </div>
      <div className={`map-canvas ${isRaster ? 'raster-canvas' : ''} ${mapTool === 'marker' ? 'map-tool-marker' : ''} ${mapTool === 'ruler' ? 'map-tool-ruler' : ''} ${mapTool === 'route-edit' ? 'map-tool-route-edit' : ''} ${globeMode ? 'globe-mode' : ''}`}>
        <div className={`mars-map-layer ${globeMode ? '' : 'is-active'}`}>
          <div ref={mapElement} className="openlayers-target" />
          {!isRaster && <div className="map-placeholder" style={{ '--map-scale': canvasView.scale, '--origin-x': `${canvasView.x}px`, '--origin-y': `${canvasView.y}px` }} aria-hidden="true">
          <div className="placeholder-orbit orbit-one" /><div className="placeholder-orbit orbit-two" />
          <div className="placeholder-crosshair"><span /><span /></div>
          <div className="placeholder-copy"><span className="placeholder-symbol">◌</span><strong>Mars surface data not connected</strong><small>Temporary canvas · no scientific imagery displayed</small><span className="placeholder-rule" /><small>CTX · HiRISE · elevation models ready to integrate</small></div>
          <div className="corner-coordinate coordinate-top">ARES // LOCAL VIEW</div>
          <div className="corner-coordinate coordinate-bottom">NO BASE RASTER LOADED</div>
          </div>}
        </div>
        <GlobeView
          key={orientationResetKey}
          scene={scene}
          markers={markers.filter((marker) => marker.sceneId === scene.id)}
          pendingRulerIds={pendingRulerIds}
          measurement={measurement}
          visible={globeMode}
          globeScale={globeScale}
          onPick={handleGlobePick}
          onCursorChange={handleGlobeCursor}
          onRulerPick={onRulerPick}
          onZoomIn={enterRasterView}
          onZoomOut={() => setGlobeScale((current) => Math.max(0.57, current - 0.08))}
          onZoomReset={() => setGlobeScale(1)}
          onStatus={onMapStatus}
        />
        {!globeMode && isRaster && <div className="raster-overlay-label"><span className="status-dot" /> {scene.product} <span>·</span> {scene.coverage}</div>}
        {toolsOpen && <MapTools id="map-tools-panel" scene={scene} markers={markers.filter((marker) => marker.sceneId === scene.id)} mapTool={mapTool} pendingRulerIds={pendingRulerIds} measurement={measurement} message={toolMessage} onSetMapTool={onSetMapTool} onRulerPick={onRulerPick} onRemoveMarker={onRemoveMarker} onClearMarkers={onClearMarkers} onClearRuler={onClearRuler} onClose={() => setToolsOpen(false)} />}
        <div ref={navigationRef} style={navigationStyle} className={`map-nav-widget ${detailsOpen ? 'details-open' : ''} ${navigationDragging ? 'is-dragging' : ''}`} aria-label="Map navigation controls">
          <div className="map-nav-grip" data-drag-handle title="Drag navigation controls" aria-label="Move navigation controls" {...navigationDragProps}>⠿</div>
          <div className="map-locate-control"><span className="north-arrow">{globeMode ? 'MARS' : 'N'}</span><span className="compass-arrow">{globeMode ? '◉' : '↑'}</span></div>
          <div className="map-control-stack"><button type="button" className="zoom-button" onClick={() => adjustZoom(1)} aria-label="Zoom in">+</button><span className="zoom-level">{globeMode ? 'GLOBE' : `${zoom.toFixed(1)}×`}</span><button type="button" className="zoom-button" onClick={() => adjustZoom(-1)} aria-label="Zoom out">−</button></div>
        </div>
        <div className="map-scale-chip"><span className="scale-glyph">━━</span><span>{globeMode ? 'Mars global view' : isRaster ? resolutionLabel : 'Scale unavailable'}</span></div>
        {!globeMode && <div className="map-click-hint">DRAG TO PAN <span>·</span> SCROLL TO ZOOM <span>·</span> {mapTool === 'marker' ? 'CLICK TO PLACE MARKER' : mapTool === 'ruler' ? 'SELECT TWO MARKERS TO MEASURE' : mapTool === 'route-edit' ? 'CLICK TO ADD · DRAG WAYPOINT TO MOVE' : 'CLICK TO INSPECT'}</div>}
      </div>
    </section>
  );
}
