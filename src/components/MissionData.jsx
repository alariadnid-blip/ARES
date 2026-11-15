import Header from './Header.jsx';

const projectPath = window.location.pathname;

export default function MissionData() {
  return (
    <div className="app-shell mission-shell">
      <Header regionName="Jezero Crater" activeNav="mission-data" />
      <main className="mission-page" id="mission-data-page">
        <section className="mission-hero">
          <div className="mission-hero-copy">
            <span className="eyebrow">ARES · MISSION BRIEF</span>
            <h1>Explore Jezero.<br /><em>Read the terrain.</em></h1>
            <p>Reconnaissance workspace for orbital context, surface scenes, field markers, and future exploration planning at Jezero Crater.</p>
            <a className="mission-open-explorer" href={`${projectPath}#explorer`}>⌖ <span>Return to Explorer</span> <b>↗</b></a>
          </div>
          <figure className="mission-hero-image">
            <img src="/mission/mars-global-reference.jpg" alt="Mars global surface reference image" />
            <figcaption><span>GLOBAL CONTEXT</span><strong>Mars surface reference</strong></figcaption>
          </figure>
          <div className="mission-hero-index"><span>01</span><i /><span>JEZERO CRATER · MARS</span></div>
        </section>

        <section className="mission-facts" aria-label="Mission overview">
          <article><span className="eyebrow">TARGET REGION</span><strong>Jezero Crater</strong><small>Western Isidis Planitia · ≈18.4°N, 77.7°E</small></article>
          <article><span className="eyebrow">REGIONAL SCALE</span><strong>≈45 km</strong><small>Approximate crater diameter</small></article>
          <article><span className="eyebrow">ARES WORKSPACE</span><strong>Orbital reconnaissance</strong><small>Scene browsing, points, and distance estimates</small></article>
        </section>

        <section className="mission-story-grid">
          <article className="mission-story-card">
            <div className="mission-section-kicker"><span>01</span><i /> SCIENCE CONTEXT</div>
            <h2>An ancient lake and delta preserved in a crater</h2>
            <p>Jezero is a roughly 45-kilometer impact crater selected as the landing site for NASA’s Perseverance rover. Orbital evidence points to an ancient lake and river delta, making the region useful for studying Mars’ past habitability and geology.</p>
            <p>ARES organizes broad regional context alongside individual high-resolution scenes. The current map layers support visual inspection; scientific classifications and rover observation records will be added when their datasets are connected.</p>
            <a className="mission-source-link" href="https://science.nasa.gov/mission/mars-2020-perseverance/" target="_blank" rel="noreferrer">NASA · Mars 2020 Perseverance overview ↗</a>
          </article>
          <figure className="mission-reference-card">
            <img src="/mission/mars-geology-reference.jpg" alt="User-supplied global geological map of Mars" />
            <figcaption><span>REFERENCE MAP</span><strong>Planetary geology context</strong><small>User-supplied reference image · not a georeferenced ARES layer</small></figcaption>
          </figure>
        </section>

        <section className="mission-data-grid">
          <article className="mission-dataset-card">
            <span className="dataset-icon">◉</span><div><span className="eyebrow">BASE MAP · NASA MARS TREK</span><h3>Jezero regional CTX mosaic</h3><p>A multi-scale CTX image layer focused on Jezero Crater and its watershed. Higher detail loads as you zoom, without relying on the global beta mosaic's known coverage gaps.</p><a href="https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars" target="_blank" rel="noreferrer">View NASA Mars Trek layer catalog ↗</a></div>
          </article>
          <article className="mission-dataset-card">
            <span className="dataset-icon">◍</span><div><span className="eyebrow">GLOBAL CONTEXT · MGS MOLA</span><h3>Color-shaded relief</h3><p>Global elevation shading for regional comparison. Blue-green tones indicate lower terrain and warm tones indicate higher terrain; shaded texture emphasizes landforms.</p><a href="https://science.nasa.gov/photojournal/mola-topographic-map/" target="_blank" rel="noreferrer">NASA · MOLA topographic map ↗</a></div>
          </article>
          <article className="mission-dataset-card">
            <span className="dataset-icon">＋</span><div><span className="eyebrow">FIELD WORKFLOW · LOCAL TOOLS</span><h3>Mark and measure</h3><p>Place coordinate-labelled points on a georeferenced scene, then select two points with the temporary ruler to estimate their great-circle separation on Mars.</p><a href={`${projectPath}#explorer`}>Open map tools ↗</a></div>
          </article>
        </section>

        <footer className="mission-footer"><span>ARES · JEZERO RECONNAISSANCE FOUNDATION</span><span>MISSION OBSERVATIONS · DATA CONNECTION PENDING</span></footer>
      </main>
    </div>
  );
}
