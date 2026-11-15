import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { transform } from 'ol/proj.js';
import { MARS_GEOGRAPHIC, getSceneProjection } from '../map/sceneProjections.js';
import { loadMarsGlobeTexture } from '../map/loadMarsGlobeTexture.js';
import { sceneById } from '../data/scenes.js';
import { namedMarsCraters, perseveranceLandingSite } from '../data/marsFeatures.js';

const GLOBAL_SURFACE_SCENE = sceneById('mars-global');

const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_radius;
  uniform float u_yaw;
  uniform float u_pitch;
  uniform float u_hasTexture;
  uniform sampler2D u_texture;

  void main() {
    vec2 point = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y * 2.0;
    float distanceSquared = dot(point, point);
    if (distanceSquared > u_radius * u_radius) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec3 viewNormal = vec3(point / u_radius, sqrt(max(0.0, 1.0 - distanceSquared / (u_radius * u_radius))));
    float cp = cos(u_pitch);
    float sp = sin(u_pitch);
    float cy = cos(u_yaw);
    float sy = sin(u_yaw);

    // Convert the visible surface normal back into Mars geographic space.
    float geographicY = cp * viewNormal.y + sp * viewNormal.z;
    float intermediateZ = -sp * viewNormal.y + cp * viewNormal.z;
    vec3 geographicNormal = vec3(
      cy * viewNormal.x - sy * intermediateZ,
      geographicY,
      sy * viewNormal.x + cy * intermediateZ
    );
    float latitude = asin(clamp(geographicNormal.y, -1.0, 1.0));
    float longitude = atan(geographicNormal.x, geographicNormal.z);
    vec2 uv = vec2(longitude / 6.28318530718 + 0.5, 0.5 - latitude / 3.14159265359);

    vec3 color;
    if (u_hasTexture > 0.5) {
      color = texture2D(u_texture, uv).rgb;
    } else {
      float latitudeGrid = abs(fract(latitude * 18.0 / 3.14159265 + 0.5) - 0.5);
      float longitudeGrid = abs(fract(longitude * 36.0 / 6.2831853 + 0.5) - 0.5);
      float grid = 1.0 - smoothstep(0.475, 0.5, min(latitudeGrid, longitudeGrid));
      color = mix(vec3(0.105, 0.105, 0.17), vec3(0.30, 0.16, 0.115), grid * 0.36);
    }

    vec3 lightDirection = normalize(vec3(-0.42, 0.24, 0.88));
    float light = 0.20 + 0.80 * max(dot(viewNormal, lightDirection), 0.0);
    float rim = pow(1.0 - max(viewNormal.z, 0.0), 3.0);
    color = color * light + vec3(0.11, 0.19, 0.28) * rim * 0.6;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'The Mars globe shader could not be compiled.');
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'The Mars globe shader could not be linked.');
  return program;
}

function wrapLongitude(value) {
  return ((value + 540) % 360) - 180;
}

function rotateToView(latitude, longitude, yaw, pitch) {
  const lat = latitude * Math.PI / 180;
  const lon = wrapLongitude(longitude) * Math.PI / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const turnedX = cy * x + sy * z;
  const turnedZ = -sy * x + cy * z;
  return {
    x: turnedX,
    y: cp * y - sp * turnedZ,
    z: sp * y + cp * turnedZ,
  };
}

function markerLocation(marker, scene) {
  try {
    const projection = getSceneProjection(scene.projectionCode);
    const [longitude, latitude] = transform(marker.coordinate, projection, MARS_GEOGRAPHIC);
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export default function GlobeView({
  scene,
  markers = [],
  pendingRulerIds = [],
  measurement = null,
  visible,
  onPick,
  onCursorChange,
  onRulerPick,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onStatus,
  globeScale = 1,
}) {
  const globeTextureScene = scene.globeTexture ? scene : GLOBAL_SURFACE_SCENE;
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const rotationRef = useRef({ yaw: 0, pitch: 0 });
  const pointerRef = useRef(null);
  const handlersRef = useRef({});
  const globeScaleRef = useRef(globeScale);
  const drawRef = useRef(null);
  const frameRef = useRef(0);
  const visibleRef = useRef(visible);
  const onStatusRef = useRef(onStatus);
  const [textureState, setTextureState] = useState(null);
  const textureMatchesScene = textureState?.sceneId === globeTextureScene.id;
  const textureError = textureMatchesScene && textureState.error;
  const textureSource = textureMatchesScene ? textureState.source : null;
  const [orientation, setOrientation] = useState({ yaw: 0, pitch: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    handlersRef.current = { onPick, onCursorChange, onRulerPick, onZoomIn, onZoomOut, onZoomReset };
    globeScaleRef.current = globeScale;
    visibleRef.current = visible;
    onStatusRef.current = onStatus;
  }, [onCursorChange, onPick, onRulerPick, onStatus, onZoomIn, onZoomOut, onZoomReset, globeScale, visible]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) {
      if (visibleRef.current) onStatusRef.current?.('Globe WebGL unavailable');
      return undefined;
    }

    let program;
    let stopped = false;
    try {
      program = createProgram(gl);
    } catch {
      if (visibleRef.current) onStatusRef.current?.('Globe render error');
      return undefined;
    }
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      radius: gl.getUniformLocation(program, 'u_radius'),
      yaw: gl.getUniformLocation(program, 'u_yaw'),
      pitch: gl.getUniformLocation(program, 'u_pitch'),
      hasTexture: gl.getUniformLocation(program, 'u_hasTexture'),
      texture: gl.getUniformLocation(program, 'u_texture'),
    };
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([78, 48, 37, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.texture, 0);

    let uploaded = false;
    let width = 0;
    let height = 0;
    const resizeAndDraw = () => {
      if (stopped) return;
      const bounds = canvas.getBoundingClientRect();
      if (!visibleRef.current) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);
      const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        gl.viewport(0, 0, width, height);
      }
      const maximumRadius = Math.min(0.30, width / height * 0.82) * globeScaleRef.current;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.radius, maximumRadius);
      gl.uniform1f(uniforms.yaw, rotationRef.current.yaw);
      gl.uniform1f(uniforms.pitch, rotationRef.current.pitch);
      gl.uniform1f(uniforms.hasTexture, uploaded ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameRef.current = window.requestAnimationFrame(resizeAndDraw);
    };
    drawRef.current = resizeAndDraw;

    let cancelled = false;
    loadMarsGlobeTexture(globeTextureScene)
      .then(({ canvas: textureCanvas, source, error }) => {
        if (cancelled || stopped) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
        const uploadError = gl.getError();
        if (uploadError !== gl.NO_ERROR) throw new Error(`WebGL could not upload the Mars texture (0x${uploadError.toString(16)}).`);
        uploaded = true;
        setTextureState({ sceneId: globeTextureScene.id, source, error: false });
        if (source === 'nasa') {
          if (visibleRef.current) onStatusRef.current?.('Mars global imagery ready');
        } else {
          console.warn('ARES is showing the bundled Mars reference map on the globe; its printed projection is approximate. NASA tile error:', error);
          if (visibleRef.current) onStatusRef.current?.('Offline Mars relief reference · approximate projection');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('ARES could not render a Mars surface texture.', error);
        setTextureState({ sceneId: globeTextureScene.id, source: null, error: true });
        if (visibleRef.current) onStatusRef.current?.('Mars surface texture unavailable');
      });

    return () => {
      cancelled = true;
      stopped = true;
      window.cancelAnimationFrame(frameRef.current);
      gl.deleteTexture(texture);
      gl.deleteBuffer(positions);
      gl.deleteProgram(program);
    };
  }, [globeTextureScene]);

  useEffect(() => {
    if (!visible || !drawRef.current) return undefined;
    frameRef.current = window.requestAnimationFrame(drawRef.current);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [visible]);

  const radiusPixels = () => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return 1;
    return Math.min(bounds.height * 0.15, bounds.width * 0.41) * globeScale;
  };

  const pointOnGlobe = (clientX, clientY) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const radius = radiusPixels();
    const x = clientX - (bounds.left + bounds.width / 2);
    const y = bounds.top + bounds.height / 2 - clientY;
    const distanceSquared = (x * x + y * y) / (radius * radius);
    if (distanceSquared > 1) return null;
    const view = { x: x / radius, y: y / radius, z: Math.sqrt(Math.max(0, 1 - distanceSquared)) };
    const { yaw, pitch } = rotationRef.current;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const geographicY = cp * view.y + sp * view.z;
    const intermediateZ = -sp * view.y + cp * view.z;
    const geographicX = cy * view.x - sy * intermediateZ;
    const geographicZ = sy * view.x + cy * intermediateZ;
    return {
      latitude: Math.asin(Math.max(-1, Math.min(1, geographicY))) * 180 / Math.PI,
      longitude: wrapLongitude(Math.atan2(geographicX, geographicZ) * 180 / Math.PI),
    };
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event) => {
    const drag = pointerRef.current;
    if (!drag || drag.id !== event.pointerId) {
      handlersRef.current.onCursorChange?.(pointOnGlobe(event.clientX, event.clientY));
      return;
    }
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    if (Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 4) drag.moved = true;
    const nextOrientation = {
      yaw: rotationRef.current.yaw + dx * Math.PI / Math.max(180, stageRef.current?.clientWidth ?? 900),
      // Keep the globe under the pointer: dragging down rotates the surface
      // down with the gesture, and dragging up moves it up.
      pitch: Math.max(-1.48, Math.min(1.48, rotationRef.current.pitch + dy * Math.PI / Math.max(180, stageRef.current?.clientHeight ?? 600))),
    };
    rotationRef.current = nextOrientation;
    setOrientation(nextOrientation);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    handlersRef.current.onCursorChange?.(pointOnGlobe(event.clientX, event.clientY));
  };
  const handlePointerUp = (event) => {
    const drag = pointerRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    pointerRef.current = null;
    if (!drag.moved) {
      const location = pointOnGlobe(event.clientX, event.clientY);
      if (location) handlersRef.current.onPick?.(location);
    }
  };
  const handleWheel = (event) => {
    event.preventDefault();
    if (event.deltaY < 0) handlersRef.current.onZoomIn?.();
    else handlersRef.current.onZoomOut?.();
  };
  const resetRotation = () => {
    rotationRef.current = { yaw: 0, pitch: 0 };
    setOrientation({ yaw: 0, pitch: 0 });
    handlersRef.current.onZoomReset?.();
  };

  const radius = Math.min(stageSize.height * 0.15, stageSize.width * 0.41) * globeScale;
  const positions = new Map();
  markers.forEach((marker) => {
    const location = markerLocation(marker, scene);
    if (!location) return;
    const view = rotateToView(location.latitude, location.longitude, orientation.yaw, orientation.pitch);
    if (view.z <= 0.02) return;
    positions.set(marker.id, {
      x: stageSize.width / 2 + view.x * radius,
      y: stageSize.height / 2 - view.y * radius,
    });
  });

  const occupiedLabels = [];
  const globeFeatures = [
    ...namedMarsCraters.map((feature) => ({ ...feature, isJezero: feature.id === 14300 })),
    { ...perseveranceLandingSite, isLandingSite: true },
  ].sort((a, b) => {
    const priority = (feature) => feature.isJezero ? 10000 : feature.isLandingSite ? 9000 : feature.diameterKm ?? 0;
    return priority(b) - priority(a);
  });
  const globeFeatureLabels = [];
  globeFeatures.forEach((feature) => {
    const view = rotateToView(feature.latitude, feature.longitudeEast, orientation.yaw, orientation.pitch);
    if (view.z <= 0.06) return;
    const x = stageSize.width / 2 + view.x * radius;
    const y = stageSize.height / 2 - view.y * radius;
    const label = feature.isJezero ? 'Jezero Crater' : feature.name;
    const offsetX = feature.isJezero || feature.isLandingSite ? 17 : 0;
    const offsetY = feature.isLandingSite ? 16 : -14;
    const labelWidth = label.length * 5.1 + 12;
    const box = { left: x + offsetX - labelWidth / 2, right: x + offsetX + labelWidth / 2, top: y + offsetY - 8, bottom: y + offsetY + 8 };
    const collides = occupiedLabels.some((other) => (
      box.left < other.right + 4 && box.right + 4 > other.left && box.top < other.bottom + 4 && box.bottom + 4 > other.top
    ));
    if (collides) return;
    occupiedLabels.push(box);
    globeFeatureLabels.push({ feature, x, y, labelX: x + offsetX, labelY: y + offsetY, label });
  });
  const rulerStart = measurement ? positions.get(measurement.fromId) : null;
  const rulerEnd = measurement ? positions.get(measurement.toId) : null;

  return (
    <div
      ref={stageRef}
      className={`mars-globe-stage ${visible ? 'is-visible' : ''}`}
      style={{
        '--starfield-offset': `${(orientation.yaw * 120) % 754}px`,
        '--starfield-offset-secondary': `${(orientation.yaw * 168) % 1056}px`,
      }}
      aria-hidden={!visible}
    >
      <canvas
        ref={canvasRef}
        className="mars-globe-canvas"
        aria-label="Interactive Mars globe. Drag to rotate, click to inspect, scroll to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={(event) => { event.preventDefault(); handlersRef.current.onZoomIn?.(); }}
      />
      {rulerStart && rulerEnd && <svg className="globe-ruler-line" aria-hidden="true"><line x1={rulerStart.x} y1={rulerStart.y} x2={rulerEnd.x} y2={rulerEnd.y} /></svg>}
      <div className="globe-feature-labels" aria-label="Named Martian craters and Perseverance landing site">
        {globeFeatureLabels.map(({ feature, x, y, labelX, labelY, label }) => (
          <span
            key={feature.id}
            className={`globe-feature-label ${feature.isJezero ? 'is-jezero' : ''} ${feature.isLandingSite ? 'is-landing' : ''}`}
            style={{
              left: `${labelX}px`,
              top: `${labelY}px`,
              '--feature-x': `${x}px`,
              '--feature-y': `${y}px`,
              '--label-x': `${labelX}px`,
              '--label-y': `${labelY}px`,
            }}
            title={`${feature.latitude.toFixed(2)}° · ${feature.longitudeEast.toFixed(2)}°E`}
          >{label}</span>
        ))}
      </div>
      <div className="globe-marker-layer">
        {markers.map((marker) => {
          const position = positions.get(marker.id);
          if (!position) return null;
          const isPending = pendingRulerIds.includes(marker.id);
          return <button key={marker.id} type="button" className={`globe-marker ${isPending ? 'is-pending' : ''}`} style={{ left: `${position.x}px`, top: `${position.y}px` }} title={`${marker.label} · select coordinate`} aria-label={`Select marker ${marker.label}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => onRulerPick?.(marker.id)}>{marker.label}</button>;
        })}
      </div>
      <div className="globe-readout"><span className={`status-dot ${textureSource === 'nasa' ? '' : 'amber'}`} /><div><strong>MARS · GLOBAL CONTEXT</strong><small>{textureSource === 'nasa' ? `${globeTextureScene.globeLabel ?? 'MOLA + HRSC relief'} · drag to rotate` : textureSource === 'reference' ? 'Offline relief reference · approximate projection' : textureError ? 'Surface texture could not be loaded' : 'Loading NASA global surface tiles…'}</small></div></div>
      <button type="button" className="globe-reset-button" onClick={resetRotation} title="Center Mars prime meridian">⌖ <span>Orient</span></button>
      <span className="globe-limb-label">{textureSource === 'nasa' ? `NASA MARS TREK · ${globeTextureScene.globeLabel ?? 'MOLA + HRSC'}` : textureSource === 'reference' ? 'LOCAL GLOBAL MAP · APPROXIMATE PROJECTION' : textureError ? 'SURFACE TEXTURE UNAVAILABLE' : 'LOADING GLOBAL RASTER'}</span>
      <span className="globe-interaction-hint">DRAG TO ROTATE <i>·</i> CLICK TO INSPECT <i>·</i> SCROLL TO ENTER SCENE</span>
    </div>
  );
}
