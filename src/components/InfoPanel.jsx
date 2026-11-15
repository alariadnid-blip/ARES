import { formatCanvasCoordinate } from '../utils/coordinates.js';
import useDragPosition from '../hooks/useDragPosition.js';

function formatLatitude(value) {
  if (!Number.isFinite(value)) return 'Unavailable';
  return `${Math.abs(value).toFixed(4)}° ${value < 0 ? 'S' : 'N'}`;
}

function formatLongitude(value) {
  if (!Number.isFinite(value)) return 'Unavailable';
  return `${Math.abs(value).toFixed(4)}° ${value < 0 ? 'W' : 'E'}`;
}

export default function InfoPanel({ scene, selectedPoint, onClose = () => {} }) {
  const { ref: panelRef, style: panelStyle, dragging, dragHandleProps } = useDragPosition();
  const hasPoint = Boolean(selectedPoint);
  const isRaster = scene.kind !== 'placeholder';
  const heading = hasPoint ? selectedPoint.featureName ?? 'Inspected point' : scene.title;

  return (
    <aside ref={panelRef} style={panelStyle} className={`info-panel floating-panel ${dragging ? 'is-dragging' : ''}`} id="location-details" tabIndex={-1} aria-label="Selected location and layer details">
      <div className="info-heading panel-drag-handle" {...dragHandleProps}>
        <span className="panel-grip" aria-hidden="true">⠿</span>
        <div><span className="eyebrow">LOCATION DETAILS</span><h2>{heading}</h2></div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Hide details panel">×</button>
      </div>
      <div className="location-card">
        <div className="location-card-top"><span className="location-marker">⌖</span><span className="location-tag">{hasPoint ? selectedPoint.featureName ? 'NAMED MARS FEATURE' : 'MAP COORDINATE' : isRaster ? 'ACTIVE MARS SCENE' : 'SELECTED REGION'}</span></div>
        <p>{hasPoint ? selectedPoint.featureName ? selectedPoint.featureType : 'Coordinate selected from the active map scene.' : isRaster ? scene.description : 'Western edge of Isidis Planitia'}</p>
        <div className="location-coordinates">
          <span>LATITUDE</span><strong>{hasPoint && Number.isFinite(selectedPoint.latitude) ? formatLatitude(selectedPoint.latitude) : isRaster ? scene.coverage.split(' · ')[0] : '≈ 18° N'}</strong>
          <span>LONGITUDE</span><strong>{hasPoint && Number.isFinite(selectedPoint.longitude) ? formatLongitude(selectedPoint.longitude) : isRaster ? scene.coverage.split(' · ')[1] : '≈ 77° E'}</strong>
        </div>
        {hasPoint && <div className="canvas-coordinate">{Number.isFinite(selectedPoint.latitude) ? `Map x ${formatCanvasCoordinate(selectedPoint.x)}, y ${formatCanvasCoordinate(selectedPoint.y)} ${scene.coordinateUnits}` : `Canvas x ${formatCanvasCoordinate(selectedPoint.x)} px · y ${formatCanvasCoordinate(selectedPoint.y)} px`}</div>}
        {selectedPoint?.featureName && <div className="named-feature-detail">
          <strong>{selectedPoint.featureDiameterKm ? `${selectedPoint.featureDiameterKm.toFixed(2)} km diameter` : 'Perseverance touchdown coordinates'}</strong>
          <a href={selectedPoint.featureSourceUrl} target="_blank" rel="noreferrer">{selectedPoint.featureType === 'Crater' ? 'USGS / IAU Gazetteer entry ↗' : 'NASA Mars Explorer ↗'}</a>
        </div>}
      </div>

      {isRaster ? (
        <section className="info-section">
          <div className="section-title"><h3>Active layer</h3><span className="profile-chip">{scene.kind === 'wmts' ? 'NASA SERVICE' : scene.remote ? 'USGS DATA' : 'LOCAL TIFF'}</span></div>
          <p className="layer-summary">{scene.layerSummary}</p>
          <div className="fact-row"><span>Product</span><strong>{scene.product}</strong></div>
          <div className="fact-row"><span>Coverage</span><strong>{scene.coverage}</strong></div>
          <div className="fact-row"><span>Native resolution</span><strong>{scene.pixelResolution} {scene.pixelUnits}</strong></div>
          <div className="fact-row"><span>Raster dimensions</span><strong>{scene.rasterDimensions ?? `${scene.width.toLocaleString()} × ${scene.height.toLocaleString()} px`}</strong></div>
          <div className="fact-row"><span>Pixel format</span><strong>{scene.rasterChannels ?? `${scene.bands} band${scene.bands === 1 ? '' : 's'} · ${scene.bitDepth}-bit`}</strong></div>

          {scene.colorLegend && <div className="elevation-legend" aria-label="Qualitative MOLA and HRSC elevation guide">
            <div className="legend-title"><span>COLOR GUIDE</span><span>QUALITATIVE ELEVATION</span></div>
            <div className="legend-gradient" aria-hidden="true" />
            <div className="legend-labels">{scene.colorLegend.map((item) => <span key={item.label}>{item.label}</span>)}</div>
            <p>Blue-green generally marks lower terrain · warm tones higher terrain. Shading emphasizes relief; this blended map has no numeric elevation scale.</p>
          </div>}

          <div className="layer-interpretation"><span className="eyebrow">HOW TO READ THIS LAYER</span><p>{scene.interpretation}</p></div>
          <div className="layer-interpretation layer-use"><span className="eyebrow">USE &amp; LIMITS</span><p>{scene.scientificUse}</p><p>{scene.dataLimit}</p></div>
          <p className="source-note">
            {scene.kind === 'wmts' ? <><a href={scene.capabilitiesUrl} target="_blank" rel="noreferrer">NASA Mars Trek service metadata</a>. {scene.sourceLabel}.</> : scene.remote ? <><a href={scene.sourceUrl} target="_blank" rel="noreferrer">USGS Astrogeology product record</a>. Full-crater CTX GeoTIFF is streamed from the source. {scene.sourceLabel}.</> : <>{scene.filename}<br />Rendered from the supplied full-resolution GeoTIFF. Mars projection and raster metadata are read from the source file. {scene.sourceLabel}.</>}
          </p>
        </section>
      ) : (
        <section className="info-section">
          <div className="section-title"><h3>Region profile</h3><span className="profile-chip">REFERENCE</span></div>
          <div className="fact-row"><span>Feature</span><strong>Impact crater</strong></div>
          <div className="fact-row"><span>Approx. diameter</span><strong>45 km</strong></div>
          <div className="fact-row"><span>Regional context</span><strong>Isidis Planitia</strong></div>
          <div className="fact-row"><span>Scientific interest</span><strong>Ancient lake &amp; delta</strong></div>
          <p className="source-note">Regional summary from <a href="https://www.jpl.nasa.gov/news/press_kits/mars_2020/ingenuity/landing/mission/jezero_crater/" target="_blank" rel="noreferrer">NASA/JPL</a>. Approximate Jezero coordinates are separate from the placeholder canvas.</p>
        </section>
      )}
      <section className="observations-card"><div className="observation-icon">✳</div><div><span className="eyebrow">FIELD OBSERVATIONS</span><strong>No observations yet</strong><p>Observation records will appear here when a mission data source is connected.</p></div></section>
      <div className="info-panel-footer"><span className={`status-dot ${isRaster ? '' : 'muted'}`} /> {scene.kind === 'wmts' ? 'NASA MARS TREK' : scene.remote ? 'USGS GEO TIFF' : isRaster ? 'LOCAL GEO TIFF' : 'SCIENTIFIC DATA'} <b>{isRaster ? 'CONNECTED' : 'PENDING'}</b></div>
    </aside>
  );
}
