/* Reydious as a chip package, modelled in Blender: lid (intent), die (check), substrate (action), board (record).
   Scroll pulls the layers apart; drag turns the whole package. A request of light drops through each layer. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* Load the model as a plain .glb first; fall back to the base64 copy if that fails. */
function loadModel(name, done, fail) {
  const parse = buf => new GLTFLoader().parse(buf, '', done, fail);
  fetch(new URL(`../assets/${name}.glb`, import.meta.url))
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(parse)
    .catch(() => import(`../assets/${name}.js`).then(m => {
      const bin = atob(m.default); const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      parse(buf.buffer);
    }).catch(fail));
}

const ORDER = ['layer_intent', 'layer_check', 'layer_action', 'layer_record'];
const CLOSED = [0.36, 0.25, 0.16, 0.0];

export function mountChip(host, labels) {
  if (!host) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zoom = innerWidth >= 2500 ? 1.33 : innerWidth >= 2200 ? 1.2 : 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 960 ? 1.75 : 2) * zoom);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  host.prepend(renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 6, 4); scene.add(key);
  const warm = new THREE.DirectionalLight(0xff8a40, 1.6); warm.position.set(5, 1, -3); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x30384a, 0.6));

  const pivot = new THREE.Group(); scene.add(pivot);
  const layers = [];
  // request of light
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  const orbLight = new THREE.PointLight(0xff6a1a, 3, 2.2, 1.6); orb.add(orbLight); pivot.add(orb);
  const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,140,60,1)'); r.addColorStop(.3, 'rgba(232,97,26,.45)'); r.addColorStop(1, 'rgba(232,97,26,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); halo.scale.setScalar(0.6); orb.add(halo);
  // the beam the request travels along
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), new THREE.MeshBasicMaterial({ color: 0xe8611a, transparent: true, opacity: 0.35 })); pivot.add(beam);
  // highlight frame on the active layer
  const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.001, 1));
  const frame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: 0xe8611a, transparent: true, opacity: 0.9 })); pivot.add(frame);

  loadModel('chip', g => {
    ORDER.forEach((name, i) => {
      const o = g.scene.getObjectByName(name); if (!o) return;
      o.traverse(m => { if (m.isMesh) m.material.envMapIntensity = 0.9; });
      o.position.set(0, CLOSED[i], 0); pivot.add(o);
      const b = new THREE.Box3().setFromObject(o); const sz = b.getSize(new THREE.Vector3());
      layers[i] = { o, w: sz.x, d: sz.z };
    });
    host.classList.add('ready');
  }, e => console.warn('chip model failed', e));

  let W = 1, H = 1;
  function size() { const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; cam.aspect = W / H; cam.updateProjectionMatrix(); }
  size(); const ro = new ResizeObserver(size); ro.observe(host);

  let yaw = 0.62, pitch = 0, vYaw = 0, dragging = false, lx = 0, idle = 0;
  const el = renderer.domElement; el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; el.style.cursor = 'grabbing'; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!dragging) return; vYaw = (e.clientX - lx) * 0.008; lx = e.clientX; yaw += vYaw; idle = 0; });
  const up = () => { dragging = false; el.style.cursor = 'grab'; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  let p = 0.6, pt = 0.6, active = 0, visible = true, running = true;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(host);
  const clock = new THREE.Clock(); const v = new THREE.Vector3();

  function frameLoop() {
    if (!running) return; requestAnimationFrame(frameLoop); if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    p += (pt - p) * Math.min(1, dt * 5);
    if (!dragging) { yaw += vYaw; vYaw *= 0.94; idle += dt; if (!reduce) yaw += dt * 0.12 * Math.min(1, idle / 2); }
    pivot.rotation.y = yaw;
    const gap = 0.55 * p;
    const ys = CLOSED.map((y, i) => y + (3 - i) * gap);
    layers.forEach((L, i) => { if (!L) return; L.o.position.y = ys[i] + (i === active ? 0.04 * p : 0); });
    const top = ys[0] + 0.7, bot = ys[3];
    beam.position.y = (top + bot) / 2; beam.scale.y = top - bot;
    const ph = reduce ? 0.55 : (t / 3.2) % 1;
    orb.position.y = top - (top - bot + 0.05) * Math.min(1, ph / 0.9);
    orb.visible = ph < 0.95;
    const L = layers[active];
    if (L) { frame.position.y = ys[active] + 0.04 * p - 0.01; frame.scale.set(L.w * 1.08, 1, L.d * 1.08); frame.material.opacity = 0.5 + Math.sin(t * 3) * 0.25; }
    // framing
    const s = Math.min(1, cam.aspect / 1.2);
    const cy = (ys[0] + ys[3]) / 2 + 0.05; cam.position.set(0, cy + 3.0, 7.6 / s); cam.lookAt(0, cy, 0);
    renderer.render(scene, cam);
    // labels follow their layer, on the right edge of each plate
    if (labels) labels.forEach((lab, i) => {
      const Ly = layers[i]; if (!Ly) return;
      v.set(Ly.w * 0.62, ys[i], 0); v.applyEuler(new THREE.Euler(0, 0, 0)); v.y = ys[i];
      // project a point at the plate's right edge as seen from the camera (independent of spin)
      const wp = new THREE.Vector3(0, ys[i], 0).applyMatrix4(pivot.matrixWorld);
      wp.project(cam);
      const x = (wp.x * 0.5 + 0.5) * W, y = (-wp.y * 0.5 + 0.5) * H;
      lab.style.transform = `translate(${W - 4}px, ${y}px) translate(-100%, -50%)`;
      lab.classList.toggle('on', i === active);
    });
  }
  frameLoop();
  return {
    setProgress(v) { pt = v; },
    setActive(i) { active = i; },
    destroy() { running = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
  };
}
