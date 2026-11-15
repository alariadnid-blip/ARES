import useDragPosition from '../hooks/useDragPosition.js';

function formatCoordinate(value, positive, negative) {
  if (!Number.isFinite(value)) return null;
  return `${Math.abs(value).toFixed(4)}°${value < 0 ? negative : positive}`;
}

function markerPosition(marker, scene) {
  if (Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude)) {
    return `${formatCoordinate(marker.latitude, 'N', 'S')} · ${formatCoordinate(marker.longitude, 'E', 'W')}`;
  }
  return `x ${Math.round(marker.x)} · y ${Math.round(marker.y)} ${scene.coordinateUnits ?? 'px'}`;
}

export default function MapTools({
  id,
  scene,
  markers,
  mapTool,
  pendingRulerIds,
  measurement,
  message,
  onSetMapTool,
  onRulerPick,
  onRemoveMarker,
  onClearMarkers,
  onClearRuler,
  onClose,
}) {
  const { ref: panelRef, style: panelStyle, dragging, dragHandleProps } = useDragPosition();
  const markerById = new Map(markers.map((marker) => [marker.id, marker]));
  const start = measurement ? markerById.get(measurement.fromId) : null;
  const end = measurement ? markerById.get(measurement.toId) : null;

  return (
    <section ref={panelRef} style={panelStyle} className={`map-tools-panel floating-panel ${dragging ? 'is-dragging' : ''}`} id={id} aria-label="Map tools and placed markers">
      <div className="map-tools-heading panel-drag-handle" {...dragHandleProps}>
        <span className="panel-grip" aria-hidden="true">⠿</span>
        <div><span className="eyebrow">FIELD TOOLKIT</span><h3>Map tools</h3></div>
        <button className="map-tools-close" type="button" onClick={onClose} aria-label="Close map tools">×</button>
      </div>
      <div className="map-tool-actions">
        <button type="button" className={`map-tool-action ${mapTool === 'marker' ? 'active' : ''}`} onClick={() => onSetMapTool(mapTool === 'marker' ? 'inspect' : 'marker')} aria-pressed={mapTool === 'marker'}>
          <span aria-hidden="true">＋</span> Place marker
        </button>
        <button type="button" className={`map-tool-action ${mapTool === 'ruler' ? 'active' : ''}`} onClick={() => onSetMapTool(mapTool === 'ruler' ? 'inspect' : 'ruler')} aria-pressed={mapTool === 'ruler'}>
          <span aria-hidden="true">↗</span> Temporary ruler
        </button>
      </div>
      <p className="map-tool-message" role="status">{message}</p>
      {measurement && start && end && (
        <div className="ruler-result">
          <span className="ruler-result-icon" aria-hidden="true">↗</span>
          <div><small>{start.label} TO {end.label} · GREAT-CIRCLE ESTIMATE</small><strong>{measurement.distanceKm.toFixed(measurement.distanceKm < 10 ? 2 : 1)} km</strong></div>
          <button type="button" onClick={onClearRuler} aria-label="Clear ruler">×</button>
        </div>
      )}
      <div className="marker-list-heading"><strong>Placed markers <span>{markers.length}</span></strong>{markers.length > 0 && <button type="button" onClick={onClearMarkers}>Clear all</button>}</div>
      {markers.length === 0 ? (
        <div className="marker-empty">Choose <b>Place marker</b>, then click the map to save a coordinate.</div>
      ) : (
        <ul className="marker-list">
          {markers.map((marker) => (
            <li className={pendingRulerIds.includes(marker.id) ? 'ruler-selected' : ''} key={marker.id}>
              <button className="marker-list-choice" type="button" onClick={() => mapTool === 'ruler' && onRulerPick(marker.id)} disabled={mapTool !== 'ruler'} title={mapTool === 'ruler' ? `Use ${marker.label} as a ruler endpoint` : 'Turn on the temporary ruler to select endpoints'}>
                <span className="marker-list-pin">{marker.label}</span><span className="marker-list-position">{markerPosition(marker, scene)}</span>
              </button>
              <button className="marker-remove" type="button" onClick={() => onRemoveMarker(marker.id)} aria-label={`Remove ${marker.label}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
