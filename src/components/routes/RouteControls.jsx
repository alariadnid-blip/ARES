import { summarizeRoute } from '../../services/marsRoute.js';
import { terrainDataStatus } from '../../data/terrainStatus.js';

function formatDistance(distanceKm) {
  return Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 2 : 1)} km` : '—';
}

function formatDuration(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const totalHours = Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remaining = totalHours % 24;
  return `${days} d ${remaining} h`;
}

function formatCoordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(3)}°${value < 0 ? negative : positive}`;
}

const overlayRows = [
  { id: 'safe', label: 'Safe candidate', color: 'safe', hint: 'No verified polygons loaded' },
  { id: 'caution', label: 'Caution zones', color: 'caution', hint: 'No verified polygons loaded' },
  { id: 'hazard', label: 'Hazard zones', color: 'hazard', hint: 'No verified polygons loaded' },
  { id: 'science', label: 'Planning landmarks', color: 'science', hint: 'Approximate points from supplied concept map' },
  { id: 'photos', label: 'Geolocated rover photos', color: 'photos', hint: '0 photos with verified coordinates' },
  { id: 'waypoints', label: 'Route waypoints', color: 'waypoints', hint: 'Numbered route positions' },
];

export default function RouteControls({
  routes,
  customRoutePoints,
  routeVisibility,
  overlayVisibility,
  selectedRouteId,
  editing,
  speedKmH,
  canUndo,
  onBack,
  onToggleRoute,
  onToggleOverlay,
  onSelectRoute,
  onSpeedChange,
  onStartEdit,
  onFinishEdit,
  onUndo,
  onClearCustom,
  onDeleteWaypoint,
  onSelectWaypoint,
  onExport,
  onSelectPhoto,
  photos,
}) {
  const geolocatedPhotoCount = photos.filter((photo) => photo.coordinateVerified === true && photo.coordinateSource && Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude)).length;
  const customRoute = { id: 'custom', name: 'My custom route', type: 'custom', status: 'custom', points: customRoutePoints };
  const routeList = [...routes, ...(customRoutePoints.length ? [customRoute] : [])];
  const selectedRoute = routeList.find((route) => route.id === selectedRouteId) ?? routes[0];
  const routeMetrics = selectedRoute ? summarizeRoute(selectedRoute.points, speedKmH) : { distanceKm: 0, estimatedHours: 0 };

  return (
    <div className="route-controls" aria-label="Exploration route controls">
      <button type="button" className="route-back-button" onClick={onBack}>← <span>Back to map layers</span></button>
      <div className="route-intro">
        <div className="route-intro-icon">⌖</div>
        <div><span className="eyebrow">JEZERO CRATER</span><h3>Exploration routes</h3></div>
      </div>
      <div className="route-quality-note"><strong>ILLUSTRATIVE CONCEPT</strong><p>Route sketches use approximate labels from your reference map. They are not NASA rover tracks or validated astronaut routes.</p></div>

      <section className="route-control-section">
        <div className="route-section-heading"><h4>ROUTE OPTIONS</h4><span>SHOW / HIDE</span></div>
        {routeList.map((route) => {
          const metrics = summarizeRoute(route.points, speedKmH);
          return (
            <div className={`route-choice ${selectedRouteId === route.id ? 'is-selected' : ''} route-${route.type} route-${route.id}`} key={route.id}>
              <input type="checkbox" aria-label={`Show ${route.name}`} checked={Boolean(routeVisibility[route.id])} onChange={() => onToggleRoute(route.id)} />
              <button type="button" className="route-choice-main" onClick={() => onSelectRoute(route.id)} aria-pressed={selectedRouteId === route.id}>
                <span className="route-swatch" />
                <span><strong>{route.name}</strong><small>{route.points.length} points · {formatDistance(metrics.distanceKm)}</small></span>
              </button>
            </div>
          );
        })}
        <div className="route-metrics-grid">
          <div><span>TOTAL DISTANCE</span><strong>{formatDistance(routeMetrics.distanceKm)}</strong></div>
          <div><span>ESTIMATED TRAVEL</span><strong>{formatDuration(routeMetrics.estimatedHours)}</strong></div>
        </div>
        <label className="route-speed-control"><span>Assumed speed <strong>{speedKmH.toFixed(1)} km/h</strong></span><input type="range" min="0.5" max="4" step="0.5" value={speedKmH} onChange={(event) => onSpeedChange(Number(event.target.value))} /><small>Simplified estimate; not a mission duration.</small></label>
      </section>

      <section className="route-control-section">
        <div className="route-section-heading"><h4>MAP OVERLAYS</h4><span>DATA STATUS</span></div>
        {overlayRows.map((row) => (
          <label className="route-overlay-row" key={row.id}>
            <input type="checkbox" checked={Boolean(overlayVisibility[row.id])} onChange={() => onToggleOverlay(row.id)} />
            <span className={`overlay-swatch ${row.color}`} />
            <span className="route-overlay-copy"><strong>{row.label}</strong><small>{row.id === 'photos' ? `${geolocatedPhotoCount} photos with verified coordinates` : row.hint}</small></span>
          </label>
        ))}
        <div className="terrain-unknown"><b>UNKNOWN TERRAIN</b><p>{terrainDataStatus.message} Turning these empty overlays on will not draw fabricated zones.</p></div>
      </section>

      <section className="route-control-section route-editor-section">
        <div className="route-section-heading"><h4>ROUTE EDITOR</h4><span>ARES DATA</span></div>
        <p className="route-editor-copy">Create a route by clicking the map. Drag its numbered points to move them.</p>
        <div className="route-action-grid">
          {!editing ? <button type="button" className="route-primary-action" onClick={onStartEdit}>＋ Create route</button> : <button type="button" className="route-primary-action is-active" onClick={onFinishEdit}>✓ Finish editing</button>}
          <button type="button" onClick={onUndo} disabled={!canUndo}>↶ Undo</button>
          <button type="button" onClick={onClearCustom} disabled={!customRoutePoints.length}>Clear route</button>
          <button type="button" onClick={onExport} disabled={!customRoutePoints.length}>Export GeoJSON</button>
        </div>
        {editing && <div className="route-editing-status"><span className="status-dot amber" /> Editing · click the map to add a point</div>}
        {customRoutePoints.length > 0 && <div className="route-waypoint-list" aria-label="Custom route waypoints">
          <div className="route-section-heading"><h4>MY WAYPOINTS</h4><span>{customRoutePoints.length}</span></div>
          {customRoutePoints.map((point, index) => (
            <div className="route-waypoint-row" key={point.id}>
              <button type="button" onClick={() => onSelectWaypoint({ ...point, isCustom: true, routeName: 'My custom route' })}><i>{index + 1}</i><span><strong>{point.name || `Waypoint ${index + 1}`}</strong><small>{formatCoordinate(point.latitude, 'N', 'S')} · {formatCoordinate(point.longitude, 'E', 'W')}</small></span></button>
              <button type="button" className="route-waypoint-delete" onClick={() => onDeleteWaypoint(point.id)} aria-label={`Delete waypoint ${index + 1}`}>×</button>
            </div>
          ))}
        </div>}
      </section>

      <section className="route-control-section route-photo-section">
        <div className="route-section-heading"><h4>NASA ROVER IMAGERY</h4><span>{photos.length} PHOTOS</span></div>
        <p>Authentic Jezero panoramas. Only photos with coordinates verified in their NASA record receive camera pins; currently {geolocatedPhotoCount} are geolocated.</p>
        <div className="route-photo-list">
          {photos.map((photo) => <button type="button" className="route-photo-card" key={photo.id} onClick={() => onSelectPhoto(photo)}>
            <img src={photo.imageUrl} alt="" loading="lazy" />
            <span><strong>{photo.id}</strong><small>{photo.camera} · {photo.date}</small></span>
            <b aria-hidden="true">↗</b>
          </button>)}
        </div>
      </section>
    </div>
  );
}
