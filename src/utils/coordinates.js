export function formatCanvasCoordinate(value) {
  return Number.isFinite(value) ? `${value < 0 ? '−' : ''}${Math.abs(Math.round(value)).toLocaleString()}` : '—';
}
