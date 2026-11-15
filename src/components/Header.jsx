const navItems = [
  { id: 'explorer', label: 'Explorer', href: '#explorer' },
  { id: 'mission-data', label: 'Mission data', href: '#mission-data', target: '_blank' },
];

export default function Header({
  regionName = 'Jezero Crater',
  activeNav = 'explorer',
  onNavigate = () => {},
  layersOpen = true,
  detailsOpen = true,
  onToggleLayers = () => {},
  onToggleDetails = () => {},
}) {
  return (
    <header className="topbar">
      <a className="brand" href="#explorer" aria-label="ARES Explorer home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="13.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.3 22.8c4.3-5.4 10.3-8.2 17.8-8.3 3.7 0 6.9.6 9.6 1.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m17.2 24.5 3-8.3 3 8.3m-4.8-2.4h3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="brand-copy"><strong>ARES</strong><small>FIELD EXPLORER</small></span>
      </a>
      <div className="header-divider" />
      <div className="mission-title"><span className="eyebrow">ASTRONAUTIC RECONNAISSANCE &amp; EXPLORATION SYSTEM</span><strong>Mars Surface Operations</strong></div>
      <div className="region-pill"><span className="status-dot" /> {regionName}</div>
      <div className="header-panel-toggles" aria-label="Map panels">
        <button type="button" className={layersOpen ? 'active' : ''} onClick={onToggleLayers} aria-pressed={layersOpen} aria-label="Toggle map layers"><span aria-hidden="true">▤</span> Layers</button>
        <button type="button" className={detailsOpen ? 'active' : ''} onClick={onToggleDetails} aria-pressed={detailsOpen} aria-label="Toggle location details"><span aria-hidden="true">ⓘ</span> Details</button>
      </div>
      <nav className="top-nav" aria-label="Primary navigation">
        {navItems.map((item) => <a
          key={item.id}
          className={activeNav === item.id ? 'active' : ''}
          href={item.href}
          target={item.target}
          rel={item.target === '_blank' ? 'noreferrer' : undefined}
          aria-current={activeNav === item.id ? 'page' : undefined}
          onClick={item.target ? undefined : () => onNavigate(item.id, item.targetId ?? item.id)}
        >{item.label}</a>)}
      </nav>
      <div className="header-status"><span className="status-dot muted" /> DATA LINK <b>STANDBY</b></div>
    </header>
  );
}
