import { layerCatalog } from '../data/layers.js';
import useDragPosition from '../hooks/useDragPosition.js';
import RouteControls from './routes/RouteControls.jsx';

export default function Sidebar({ activeLayer, onSelectLayer, onClose = () => {}, routesOpen = false, routeControlProps }) {
  const { ref: panelRef, style: panelStyle, dragging, dragHandleProps } = useDragPosition();
  if (routesOpen) {
    return (
      <aside ref={panelRef} style={panelStyle} className={`sidebar floating-panel ${dragging ? 'is-dragging' : ''}`} id="layers" tabIndex={-1} aria-label="Exploration route controls">
        <div className="sidebar-heading panel-drag-handle" {...dragHandleProps}><span className="panel-grip" aria-hidden="true">⠿</span><div><span className="eyebrow">MAP CONTROLS</span><h2>Route planner</h2></div><button type="button" className="panel-close" onClick={onClose} aria-label="Return to map layers">×</button></div>
        <RouteControls {...routeControlProps} onBack={onClose} />
      </aside>
    );
  }
  return (
    <aside ref={panelRef} style={panelStyle} className={`sidebar floating-panel ${dragging ? 'is-dragging' : ''}`} id="layers" tabIndex={-1} aria-label="Map layers">
      <div className="sidebar-heading panel-drag-handle" {...dragHandleProps}>
        <span className="panel-grip" aria-hidden="true">⠿</span>
        <div><span className="eyebrow">MAP CONTROLS</span><h2>Layers</h2></div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Hide layers panel">×</button>
      </div>
      <div className="layer-list" role="list">
        {layerCatalog.map((layer) => (
          <button key={layer.id} type="button" className={`layer-item ${activeLayer === layer.id ? 'selected' : ''} ${!layer.available ? 'unavailable' : ''}`} onClick={() => layer.available && (layer.id === 'routes' ? routeControlProps.onOpenRoutes() : onSelectLayer(layer))} disabled={!layer.available} aria-pressed={activeLayer === layer.id} title={layer.available ? `${layer.id === 'routes' ? 'Open' : 'Show'} ${layer.label}` : `${layer.label} coming soon`}>
            <span className={`layer-icon icon-${layer.id}`} aria-hidden="true">{layer.icon}</span>
            <span className="layer-copy"><strong>{layer.label}</strong><small>{layer.detail}</small></span>
            {layer.available ? <span className="layer-radio" aria-hidden="true" /> : <span className="soon-tag">SOON</span>}
          </button>
        ))}
      </div>
      <div className="sidebar-footer"><span className="tiny-status-icon">i</span><p>Scientific layers will appear as mission datasets are connected.</p></div>
    </aside>
  );
}
