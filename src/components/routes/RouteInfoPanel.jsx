import useDragPosition from '../../hooks/useDragPosition.js';
import { summarizeRoute } from '../../services/marsRoute.js';

function coordinate(value, positive, negative) {
  if (!Number.isFinite(value)) return 'Unavailable';
  return `${Math.abs(value).toFixed(4)}° ${value < 0 ? negative : positive}`;
}

function formatDistance(distanceKm) {
  return Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 2 : 1)} km` : '—';
}

export default function RouteInfoPanel({ route, speedKmH, selectedItem, photos, onClose, onDeleteWaypoint }) {
  const { ref, style, dragging, dragHandleProps } = useDragPosition();
  const selectedPhoto = selectedItem?.routeItemType === 'rover-photo' ? selectedItem.photo : null;
  const selectedWaypoint = selectedItem?.routeItemType === 'waypoint' || selectedItem?.routeItemType === 'science-point' ? selectedItem : null;
  const selectedZone = selectedItem?.routeItemType === 'hazard-zone' ? selectedItem : null;
  const selectedMapPoint = selectedItem && !selectedPhoto && !selectedWaypoint && !selectedZone && selectedItem.routeItemType !== 'route' ? selectedItem : null;
  const selectedRoute = selectedItem?.routeId ? selectedItem : route;
  const selectedItemIndex = selectedWaypoint && selectedRoute?.points ? selectedRoute.points.findIndex((item) => item.id === selectedWaypoint.waypointId || item.id === selectedWaypoint.id) : -1;
  const previous = selectedItemIndex > 0 ? selectedRoute.points[selectedItemIndex - 1] : null;
  const segmentKm = previous && selectedWaypoint ? summarizeRoute([previous, selectedWaypoint]).distanceKm : null;
  const metrics = summarizeRoute(route?.points ?? [], speedKmH);
  const heading = selectedPhoto?.title ?? selectedWaypoint?.name ?? selectedZone?.name ?? selectedMapPoint?.featureName ?? (selectedMapPoint ? 'Selected map coordinate' : route?.name) ?? 'Exploration routes';

  return (
    <aside ref={ref} style={style} className={`info-panel floating-panel route-info-panel ${dragging ? 'is-dragging' : ''}`} id="location-details" tabIndex={-1} aria-label="Route and selected location details">
      <div className="info-heading panel-drag-handle" {...dragHandleProps}>
        <span className="panel-grip" aria-hidden="true">⠿</span>
        <div><span className="eyebrow">{selectedPhoto ? 'NASA PHOTO RECORD' : selectedWaypoint ? 'ROUTE WAYPOINT' : selectedZone ? 'TERRAIN CLASSIFICATION' : selectedMapPoint ? 'MAP LOCATION' : 'ROUTE OVERVIEW'}</span><h2>{heading}</h2></div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Hide details panel">×</button>
      </div>
      {selectedPhoto ? <>
        <figure className="route-photo-detail"><a href={selectedPhoto.imageUrl} target="_blank" rel="noreferrer" aria-label={`Open full-size ${selectedPhoto.id} image`}><img src={selectedPhoto.imageUrl} alt={selectedPhoto.title} /></a><figcaption>{selectedPhoto.credit} · Open image for full size</figcaption></figure>
        <div className="route-detail-card"><span className="route-data-badge">NASA / JPL PHOTOJOURNAL</span><p>{selectedPhoto.description}</p>
          <div className="fact-row"><span>Rover</span><strong>{selectedPhoto.rover}</strong></div>
          <div className="fact-row"><span>Camera</span><strong>{selectedPhoto.camera}</strong></div>
          <div className="fact-row"><span>Acquired</span><strong>{selectedPhoto.date}</strong></div>
          <div className="fact-row"><span>Coordinates</span><strong>Not in source record</strong></div>
          <a className="route-source-link" href={selectedPhoto.sourceUrl} target="_blank" rel="noreferrer">Open original NASA record ↗</a>
        </div>
      </> : selectedZone ? <div className="route-detail-card route-zone-detail">
        <span className={`route-data-badge ${selectedZone.classification === 'hazard' ? 'hazard' : selectedZone.classification === 'safe' ? 'verified' : 'approximate'}`}>{selectedZone.classification?.toUpperCase() ?? 'TERRAIN ZONE'}</span>
        <p>{selectedZone.description ?? 'Terrain classification from a supplied GeoJSON layer.'}</p>
        <div className="location-coordinates"><span>LATITUDE</span><strong>{coordinate(selectedZone.latitude, 'N', 'S')}</strong><span>LONGITUDE</span><strong>{coordinate(selectedZone.longitude, 'E', 'W')}</strong></div>
        <div className="fact-row"><span>Type</span><strong>{selectedZone.hazardType ?? selectedZone.classification}</strong></div>
        <div className="fact-row"><span>Dataset</span><strong>{selectedZone.dataSource ?? selectedZone.source ?? 'No source supplied'}</strong></div>
        <div className="fact-row"><span>Resolution</span><strong>{selectedZone.dataResolution ?? 'Not specified'}</strong></div>
        <div className="fact-row"><span>Confidence</span><strong>{selectedZone.confidence ?? 'Not specified'}</strong></div>
        <div className="route-unknown-card"><p>A mapped classification is a planning aid and is not a guarantee of astronaut safety.</p></div>
        {selectedZone.zoneSourceUrl && <a className="route-source-link" href={selectedZone.zoneSourceUrl} target="_blank" rel="noreferrer">Open dataset source ↗</a>}
      </div> : selectedMapPoint ? <div className="route-detail-card">
        <span className="route-data-badge">SELECTED MAP LOCATION</span>
        <div className="location-coordinates"><span>LATITUDE</span><strong>{coordinate(selectedMapPoint.latitude, 'N', 'S')}</strong><span>LONGITUDE</span><strong>{coordinate(selectedMapPoint.longitude, 'E', 'W')}</strong></div>
        {selectedMapPoint.featureType && <div className="fact-row"><span>Feature</span><strong>{selectedMapPoint.featureType}</strong></div>}
        {selectedMapPoint.featureDiameterKm && <div className="fact-row"><span>Diameter</span><strong>{selectedMapPoint.featureDiameterKm.toFixed(2)} km</strong></div>}
        {selectedMapPoint.featureSourceUrl && <a className="route-source-link" href={selectedMapPoint.featureSourceUrl} target="_blank" rel="noreferrer">Open source record ↗</a>}
      </div> : selectedWaypoint ? <div className="route-detail-card">
        <span className={`route-data-badge ${selectedWaypoint.verified ? 'verified' : 'approximate'}`}>{selectedWaypoint.verified ? 'VERIFIED LANDING SITE' : 'APPROXIMATE CONCEPT LOCATION'}</span>
        <div className="location-coordinates"><span>LATITUDE</span><strong>{coordinate(selectedWaypoint.latitude, 'N', 'S')}</strong><span>LONGITUDE</span><strong>{coordinate(selectedWaypoint.longitude, 'E', 'W')}</strong></div>
        {selectedWaypoint.sequence && <div className="fact-row"><span>Sequence</span><strong>{selectedWaypoint.sequence}</strong></div>}
        {selectedWaypoint.routeName && <div className="fact-row"><span>Route</span><strong>{selectedWaypoint.routeName}</strong></div>}
        {selectedWaypoint.classification && <div className="fact-row"><span>Point class</span><strong>{selectedWaypoint.classification}</strong></div>}
        <div className="fact-row"><span>From previous</span><strong>{formatDistance(segmentKm)}</strong></div>
        <div className="fact-row"><span>Terrain</span><strong>Unknown · no DEM</strong></div>
        <p>{selectedWaypoint.description ?? selectedWaypoint.significance}</p>
        {selectedWaypoint.sourceUrl && <a className="route-source-link" href={selectedWaypoint.sourceUrl} target="_blank" rel="noreferrer">NASA location reference ↗</a>}
        {!selectedWaypoint.verified && selectedWaypoint.source && <small className="route-source-note">{selectedWaypoint.source}</small>}
        {selectedWaypoint.isCustom && <button type="button" className="route-delete-selected" onClick={() => onDeleteWaypoint(selectedWaypoint.id)}>Delete this waypoint</button>}
      </div> : <>
        <div className="location-card route-overview-card"><div className="location-card-top"><span className="location-marker">⌖</span><span className="location-tag">{route?.status === 'custom' ? 'USER-CREATED ROUTE' : 'ILLUSTRATIVE PLANNING DATA'}</span></div>
          <p>{route?.description ?? 'Choose a route or create one from map coordinates.'}</p>
          <div className="route-overview-metrics"><div><span>WAYPOINTS</span><strong>{route?.points.length ?? 0}</strong></div><div><span>DISTANCE</span><strong>{formatDistance(metrics.distanceKm)}</strong></div><div><span>ESTIMATED TIME</span><strong>{metrics.estimatedHours?.toFixed(1) ?? '—'} h</strong></div></div>
        </div>
        <div className="route-detail-card route-unknown-card"><b>Terrain classification: UNKNOWN</b><p>No verified slope, DEM, or hazard polygons are connected. No safety conclusion can be drawn from this route sketch.</p></div>
        <section className="info-section"><div className="section-title"><h3>Route waypoints</h3><span className="profile-chip">APPROXIMATE</span></div>
          {(route?.points ?? []).map((point, index) => <div className="route-info-waypoint" key={point.id}><i>{index + 1}</i><span><strong>{point.name}</strong><small>{coordinate(point.latitude, 'N', 'S')} · {coordinate(point.longitude, 'E', 'W')}</small></span><b>{index ? formatDistance(metrics.segments[index - 1]?.distanceKm) : 'START'}</b></div>)}
        </section>
        <div className="route-photo-link-note"><strong>NASA imagery available</strong><small>{photos.length} photos in the route panel. Source coordinates are unavailable, so their locations are not plotted.</small></div>
      </>}
      <div className="info-panel-footer"><span className={`status-dot ${selectedPhoto || selectedWaypoint?.verified ? '' : 'amber'}`} /> DATA PROVENANCE <b>{selectedWaypoint?.verified || selectedPhoto ? 'NASA' : 'ARES ILLUSTRATION'}</b></div>
    </aside>
  );
}
