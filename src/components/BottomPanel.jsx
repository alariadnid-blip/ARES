import { formatCanvasCoordinate } from '../utils/coordinates.js';

function formatCoordinate(value, positive, negative) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.abs(value).toFixed(3)}°${value < 0 ? negative : positive}`;
}

export default function BottomPanel({ activeLayer, cursor, mapScale, mapStatus, activeRoute = null, activeOverlays = [] }) {
  const position = cursor?.latitude != null
    ? `${formatCoordinate(cursor.latitude, 'N', 'S')} · ${formatCoordinate(cursor.longitude, 'E', 'W')}`
    : cursor ? `x ${formatCanvasCoordinate(cursor.x)} · y ${formatCanvasCoordinate(cursor.y)} px` : 'Georeference pending';
  return (
    <footer className="bottom-panel" aria-label="Map status">
      <div className="bottom-item coordinates-item"><span className="bottom-icon">⌖</span><div><small>CURSOR POSITION</small><strong>{position}</strong></div></div>
      <div className="bottom-item"><span className="bottom-icon scale-icon">━━</span><div><small>MAP SCALE</small><strong>{mapScale}</strong></div></div>
      <div className="bottom-item"><span className="bottom-icon layer-bottom-icon">◉</span><div><small>{activeRoute ? 'ACTIVE ROUTE' : 'ACTIVE LAYER'}</small><strong>{activeRoute ?? activeLayer?.label ?? 'Surface canvas'}</strong></div></div>
      {activeRoute && <div className="bottom-item route-overlay-bottom-item"><span className="bottom-icon">◈</span><div><small>VISIBLE OVERLAYS</small><strong>{activeOverlays.length ? activeOverlays.join(' · ') : 'None'}</strong></div></div>}
      <div className="bottom-spacer" />
      <div className="map-status"><span className={`status-dot ${mapStatus === 'Raster ready' ? '' : 'amber'}`} /><div><small>MAP STATUS</small><strong>{mapStatus}</strong></div><span className="status-chevron">⌄</span></div>
    </footer>
  );
}
