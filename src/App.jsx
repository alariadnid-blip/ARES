import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import BottomPanel from './components/BottomPanel.jsx';
import MissionData from './components/MissionData.jsx';
import RouteInfoPanel from './components/routes/RouteInfoPanel.jsx';
import { layerCatalog } from './data/layers.js';
import { sceneById } from './data/scenes.js';
import { explorationRoutes, roverPhotographs } from './data/explorationRoutes.js';
import { downloadRouteGeoJSON } from './services/marsRoute.js';
import './styles/global.css';

const MapView = lazy(() => import('./components/MapView.jsx'));

export default function App() {
  const [missionDataPage, setMissionDataPage] = useState(() => window.location.hash === '#mission-data');
  const [activeNav, setActiveNav] = useState(() => {
    if (window.location.hash === '#mission-data') return 'mission-data';
    return 'explorer';
  });
  const [activeLayer, setActiveLayer] = useState('base');
  const [activeSceneId, setActiveSceneId] = useState('jezero');
  const [cursor, setCursor] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mapStatus, setMapStatus] = useState('Loading map layer');
  const [mapScale, setMapScale] = useState('Planetary view');
  const [layersOpen, setLayersOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mapTool, setMapTool] = useState('inspect');
  const [markers, setMarkers] = useState([]);
  const [pendingRulerIds, setPendingRulerIds] = useState([]);
  const [measurement, setMeasurement] = useState(null);
  const [toolMessage, setToolMessage] = useState('Pan and inspect the map, or select a tool to begin.');
  const [routesOpen, setRoutesOpen] = useState(false);
  const [routeVisibility, setRouteVisibility] = useState({ primary: true, 'alternative-a': false, 'alternative-b': false, custom: true });
  const [overlayVisibility, setOverlayVisibility] = useState({ waypoints: true, science: true, photos: false, safe: false, caution: false, hazard: false });
  const [selectedRouteId, setSelectedRouteId] = useState('primary');
  const [customRoutePoints, setCustomRoutePoints] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  const [routeSpeed, setRouteSpeed] = useState(1);

  const handleLayerChange = useCallback((layer) => {
    setActiveLayer(layer.id);
    setActiveSceneId(layer.sceneId);
    setCursor(null);
    setSelectedPoint(null);
    setMapScale('Planetary view');
    setMarkers([]);
    setMeasurement(null);
    setPendingRulerIds([]);
    setMapTool('inspect');
    setToolMessage('New map scene selected. Place markers in this scene.');
  }, []);

  const handleCursorChange = useCallback((position) => setCursor(position), []);
  const handleSelectPoint = useCallback((point) => {
    setSelectedPoint(point);
    if (point?.routeItemType === 'route' && point.routeId) setSelectedRouteId(point.routeId);
  }, []);
  const handlePlaceMarker = useCallback((point) => {
    if (!point) return;
    const nextNumber = Math.max(0, ...markers.map((marker) => Number(marker.label.slice(1)) || 0)) + 1;
    const marker = {
      id: `marker-${Date.now()}-${nextNumber}`,
      label: `P${nextNumber}`,
      ...point,
      sceneId: activeSceneId,
      coordinate: [...point.coordinate],
    };
    setMarkers((current) => [...current, marker]);
    setSelectedPoint(point);
    setToolMessage(`${marker.label} placed. Its coordinates are saved in this scene.`);
  }, [activeSceneId, markers]);
  const handleSetMapTool = useCallback((tool) => {
    setMapTool(tool);
    setPendingRulerIds([]);
    if (tool === 'marker') setToolMessage('Click the map to place a coordinate marker.');
    else if (tool === 'ruler') {
      setMeasurement(null);
      setToolMessage('Choose two existing markers from the list or click their pins on the map.');
    } else setToolMessage('Pan and inspect the map, or select a tool to begin.');
  }, []);
  const handleRulerPick = useCallback((markerId) => {
    const marker = markers.find((item) => item.id === markerId);
    if (!marker) return;
    if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) {
      setToolMessage('Distance measurement needs geographic coordinates. Switch to a georeferenced Mars scene.');
      return;
    }
    if (pendingRulerIds.length === 0) {
      setPendingRulerIds([markerId]);
      setMeasurement(null);
      setToolMessage(`${marker.label} selected. Choose a second marker to measure the distance.`);
      return;
    }
    const firstId = pendingRulerIds[0];
    if (firstId === markerId) return;
    const first = markers.find((item) => item.id === firstId);
    const radians = (degrees) => (degrees * Math.PI) / 180;
    const lat1 = radians(first.latitude);
    const lat2 = radians(marker.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = radians((((marker.longitude - first.longitude) + 540) % 360) - 180);
    const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const distanceKm = 2 * 3389.5 * Math.asin(Math.sqrt(Math.min(1, haversine)));
    setMeasurement({ fromId: firstId, toId: markerId, distanceKm });
    setPendingRulerIds([]);
    setToolMessage('Distance estimated along a spherical Mars surface.');
  }, [markers, pendingRulerIds]);
  const handleRemoveMarker = useCallback((markerId) => {
    setMarkers((current) => current.filter((marker) => marker.id !== markerId));
    if (measurement?.fromId === markerId || measurement?.toId === markerId) setMeasurement(null);
    setPendingRulerIds((current) => current.filter((id) => id !== markerId));
  }, [measurement]);
  const handleClearMarkers = useCallback(() => {
    setMarkers([]);
    setMeasurement(null);
    setPendingRulerIds([]);
    setMapTool('inspect');
    setToolMessage('All markers and ruler lines were cleared.');
  }, []);
  const handleClearRuler = useCallback(() => {
    setMeasurement(null);
    setPendingRulerIds([]);
    setToolMessage('Temporary ruler cleared. Select two markers to measure again.');
  }, []);
  const commitCustomRoute = useCallback((nextPoints) => {
    setRouteHistory((history) => [...history.slice(-49), customRoutePoints]);
    setCustomRoutePoints(nextPoints);
  }, [customRoutePoints]);
  const handleAddRouteWaypoint = useCallback((point) => {
    if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude)) {
      setToolMessage('A georeferenced Mars map is required to save route coordinates.');
      return;
    }
    const waypoint = {
      id: `custom-waypoint-${Date.now()}-${customRoutePoints.length + 1}`,
      sequence: customRoutePoints.length + 1,
      name: `Waypoint ${customRoutePoints.length + 1}`,
      latitude: point.latitude,
      longitude: point.longitude,
    };
    commitCustomRoute([...customRoutePoints, waypoint]);
    setSelectedRouteId('custom');
    setRouteVisibility((visibility) => ({ ...visibility, custom: true }));
    setOverlayVisibility((visibility) => ({ ...visibility, waypoints: true }));
    setSelectedPoint({ ...waypoint, routeItemType: 'waypoint', routeId: 'custom', routeName: 'My custom route', isCustom: true, points: [...customRoutePoints, waypoint] });
    setToolMessage(`${waypoint.name} added. Drag its numbered pin to adjust the coordinate.`);
  }, [commitCustomRoute, customRoutePoints]);
  const handleMoveRouteWaypoint = useCallback((waypointId, geographic) => {
    const nextPoints = customRoutePoints.map((point) => point.id === waypointId
      ? { ...point, latitude: geographic.latitude, longitude: geographic.longitude }
      : point);
    if (nextPoints.some((point, index) => point !== customRoutePoints[index])) commitCustomRoute(nextPoints);
  }, [commitCustomRoute, customRoutePoints]);
  const handleDeleteRouteWaypoint = useCallback((waypointId) => {
    const nextPoints = customRoutePoints.filter((point) => point.id !== waypointId).map((point, index) => ({ ...point, sequence: index + 1, name: `Waypoint ${index + 1}` }));
    if (nextPoints.length === customRoutePoints.length) return;
    commitCustomRoute(nextPoints);
    setSelectedPoint(null);
  }, [commitCustomRoute, customRoutePoints]);
  const handleClearCustomRoute = useCallback(() => {
    if (!customRoutePoints.length) return;
    commitCustomRoute([]);
    setSelectedPoint(null);
    setMapTool('inspect');
    setToolMessage('Custom route cleared.');
  }, [commitCustomRoute, customRoutePoints]);
  const handleUndoRoute = useCallback(() => {
    if (!routeHistory.length) return;
    const previous = routeHistory[routeHistory.length - 1];
    setRouteHistory(routeHistory.slice(0, -1));
    setCustomRoutePoints(previous);
    setSelectedPoint(null);
    setToolMessage('Last route edit undone.');
  }, [routeHistory]);
  const handleOpenRoutes = useCallback(() => {
    setRoutesOpen(true);
    setDetailsOpen(true);
    setSelectedPoint(null);
    if (activeSceneId !== 'jezero') handleLayerChange(layerCatalog.find((layer) => layer.id === 'base'));
  }, [activeSceneId, handleLayerChange]);
  const handleStartRouteEdit = useCallback(() => {
    setRoutesOpen(true);
    setDetailsOpen(true);
    if (activeSceneId !== 'jezero') handleLayerChange(layerCatalog.find((layer) => layer.id === 'base'));
    setSelectedRouteId('custom');
    setRouteVisibility((visibility) => ({ ...visibility, custom: true }));
    setMapTool('route-edit');
    setToolMessage('Click the Jezero map to add a route waypoint.');
  }, [activeSceneId, handleLayerChange]);
  const handleFinishRouteEdit = useCallback(() => {
    setMapTool('inspect');
    setToolMessage('Route editing finished.');
  }, []);
  const handleRouteSelectWaypoint = useCallback((waypoint) => {
    setSelectedPoint({
      ...waypoint,
      routeItemType: waypoint.isCustom ? 'waypoint' : 'waypoint',
      routeId: waypoint.routeId ?? selectedRouteId,
      routeName: waypoint.routeName ?? 'My custom route',
      isCustom: Boolean(waypoint.isCustom),
      points: waypoint.isCustom ? customRoutePoints : (explorationRoutes.find((route) => route.id === (waypoint.routeId ?? selectedRouteId))?.points ?? []),
    });
  }, [customRoutePoints, selectedRouteId]);
  const handleSelectPhoto = useCallback((photo) => setSelectedPoint({ routeItemType: 'rover-photo', photo }), []);
  const handleExportRoute = useCallback(() => {
    const route = selectedRouteId === 'custom'
      ? { id: 'ares-custom-jezero', name: 'ARES custom Jezero route', type: 'custom', status: 'custom', source: 'Created by the user in ARES.' }
      : explorationRoutes.find((item) => item.id === selectedRouteId) ?? explorationRoutes[0];
    const points = selectedRouteId === 'custom' ? customRoutePoints : route.points;
    if (points.length) downloadRouteGeoJSON(route, points, route.status);
  }, [customRoutePoints, selectedRouteId]);
  const handleMapStatus = useCallback((status) => setMapStatus(status), []);
  const handleMapScale = useCallback((scale) => setMapScale(scale), []);
  const handleNavigate = useCallback((navId, targetId) => {
    setActiveNav(navId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
      target.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    const syncActiveNav = () => {
      const isMissionData = window.location.hash === '#mission-data';
      setMissionDataPage(isMissionData);
      setActiveNav(isMissionData ? 'mission-data' : 'explorer');
    };
    window.addEventListener('hashchange', syncActiveNav);
    return () => window.removeEventListener('hashchange', syncActiveNav);
  }, []);

  const activeLayerInfo = layerCatalog.find((layer) => layer.id === activeLayer);
  const activeScene = sceneById(activeSceneId);
  const routeControlProps = {
    routes: explorationRoutes,
    customRoutePoints,
    routeVisibility,
    overlayVisibility,
    selectedRouteId,
    editing: mapTool === 'route-edit',
    speedKmH: routeSpeed,
    canUndo: routeHistory.length > 0,
    photos: roverPhotographs,
    onOpenRoutes: handleOpenRoutes,
    onToggleRoute: (routeId) => setRouteVisibility((visibility) => ({ ...visibility, [routeId]: !visibility[routeId] })),
    onToggleOverlay: (overlayId) => setOverlayVisibility((visibility) => ({ ...visibility, [overlayId]: !visibility[overlayId] })),
    onSelectRoute: (routeId) => { setSelectedRouteId(routeId); setSelectedPoint(null); },
    onSpeedChange: setRouteSpeed,
    onStartEdit: handleStartRouteEdit,
    onFinishEdit: handleFinishRouteEdit,
    onUndo: handleUndoRoute,
    onClearCustom: handleClearCustomRoute,
    onDeleteWaypoint: handleDeleteRouteWaypoint,
    onSelectWaypoint: handleRouteSelectWaypoint,
    onExport: handleExportRoute,
    onSelectPhoto: handleSelectPhoto,
  };

  if (missionDataPage) return <MissionData />;

  return (
    <div className={`app-shell earth-shell ${detailsOpen ? 'details-open' : ''}`}>
      <Header
        regionName={activeScene.regionLabel}
        activeNav={activeNav}
        onNavigate={handleNavigate}
        layersOpen={layersOpen}
        detailsOpen={detailsOpen}
        onToggleLayers={() => setLayersOpen((open) => !open)}
        onToggleDetails={() => setDetailsOpen((open) => !open)}
      />
      <main className="workspace" id="explorer" tabIndex={-1}>
        {layersOpen && <Sidebar activeLayer={activeLayer} onSelectLayer={handleLayerChange} onClose={() => setRoutesOpen(false)} routesOpen={routesOpen} routeControlProps={routeControlProps} />}
        <section className="map-column" aria-label="Mars map workspace">
          <Suspense fallback={<div className="map-frame map-loading" role="status"><span className="status-dot amber" />Loading map controls…</div>}>
            <MapView
              key={activeScene.id}
              scene={activeScene}
              detailsOpen={detailsOpen}
              onCursorChange={handleCursorChange}
              onSelectPoint={handleSelectPoint}
              onPlaceMarker={handlePlaceMarker}
              onRulerPick={handleRulerPick}
              onMapStatus={handleMapStatus}
              onScaleChange={handleMapScale}
              markers={markers}
              mapTool={mapTool}
              pendingRulerIds={pendingRulerIds}
              measurement={measurement}
              toolMessage={toolMessage}
              onSetMapTool={handleSetMapTool}
              onRemoveMarker={handleRemoveMarker}
              onClearMarkers={handleClearMarkers}
              onClearRuler={handleClearRuler}
              routes={explorationRoutes}
              customRoutePoints={customRoutePoints}
              routeVisibility={routeVisibility}
              overlayVisibility={overlayVisibility}
              selectedRouteId={selectedRouteId}
              onAddRouteWaypoint={handleAddRouteWaypoint}
              onMoveRouteWaypoint={handleMoveRouteWaypoint}
            />
          </Suspense>
          <BottomPanel activeLayer={activeLayerInfo} cursor={cursor} mapScale={mapScale} mapStatus={mapStatus} />
        </section>
        {detailsOpen && (routesOpen || selectedPoint?.routeItemType ? (
          <RouteInfoPanel
            route={selectedRouteId === 'custom'
              ? { id: 'custom', name: 'My custom route', type: 'custom', status: 'custom', description: 'A user-created route on the active Mars map.', points: customRoutePoints }
              : explorationRoutes.find((route) => route.id === selectedRouteId)}
            speedKmH={routeSpeed}
            selectedItem={selectedPoint}
            photos={roverPhotographs}
            onClose={() => setDetailsOpen(false)}
            onDeleteWaypoint={handleDeleteRouteWaypoint}
          />
        ) : <InfoPanel scene={activeScene} selectedPoint={selectedPoint} onClose={() => setDetailsOpen(false)} />)}
      </main>
    </div>
  );
}
