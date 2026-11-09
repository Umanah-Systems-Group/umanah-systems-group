/* USG Radius as a real 3D stack of layers (three.js). Same layers and story as the flat drawing it sits
   over: products, people + AI agents, USG Radius (guard, Ask / Check / Act / Record, logbook), the shared
   toolbox, machines + systems. Drag to turn it; scroll pulls the layers apart; a request of light runs
   through it. If WebGL is missing, the flat drawing simply stays. */
import * as THREE from 'three';

const S = 4, H = 2, TH = 0.22;            // slab size, half size, thickness
const K = H / 178 * 0.98;                  // flat-drawing plane units -> world
const OR = 0xe8611a;

function textCanvas(text, { size = 64, color = '#c9ced8', font = '500', mono = false, pad = 16, bg = null } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const f = `${font} ${size}px ${mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'Inter Tight, Inter, system-ui, sans-serif'}`;
  g.font = f; const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = Math.ceil(size * 1.5);
  g.font = f; g.textBaseline = 'middle';
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 4, w, c.height - 8, (c.height - 8) / 2); g.fill(); }
  g.fillStyle = color; g.fillText(text, pad, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, aspect: w / c.height };
}

function label(text, h = 0.17, opts = {}) {
  const { tex, aspect } = textCanvas(text, opts);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  h *= 1.3; s.scale.set(h * aspect, h, 1); s.renderOrder = 10; s.center.set(0.5, 0);
  return s;
}

const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,170,110,1)'); r.addColorStop(.25, 'rgba(232,97,26,.6)'); r.addColorStop(1, 'rgba(232,97,26,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const glow = (s = 0.5, color = 0xffffff) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); m.scale.setScalar(s); return m; };

export function mountPlatform3D(host) {
  const svg = host && host.querySelector('svg.stk');
  if (!svg) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 960 ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  const cv = renderer.domElement; cv.className = 'stk3d'; cv.style.touchAction = 'pan-y';
  host.appendChild(cv); host.classList.add('is3d');

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xb4bfdc, 0x14161e, 1.6)); scene.add(new THREE.AmbientLight(0x40485e, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 8, 6); scene.add(key);
  const warm = new THREE.PointLight(OR, 6, 7, 1.5); scene.add(warm);

  const pivot = new THREE.Group(); scene.add(pivot);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .25, ...o });
  const edges = (geo, color = 0xffffff, opacity = .18) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  const at = (x, y) => [x * K, y * K]; // flat drawing (x, y) -> world (x, z)

  function cube(group, x, y, w, h, color, o = {}) {
    const g = new THREE.BoxGeometry(w, h, w);
    const m = new THREE.Mesh(g, mat(color, o)); const [wx, wz] = at(x, y);
    m.position.set(wx, TH / 2 + h / 2, wz); group.add(m);
    const e = edges(g, o.edge ?? 0xffffff, o.edgeOpacity ?? .22); e.position.copy(m.position); group.add(e);
    return m;
  }
  function tag(group, x, y, yy, text, h, opts) { const s = label(text, h, opts); const [wx, wz] = at(x, y); s.position.set(wx, yy, wz); group.add(s); return s; }

  /* the five layers, top to bottom */
  const defs = [
    { name: '→ Products', color: 0x262c3c, edge: 0xffffff },
    { name: '→ People + AI agents', color: 0x222838, edge: 0xffffff },
    { name: '→ USG Radius', color: 0x4a2410, edge: OR, radius: true },
    { name: '→ Shared toolbox', color: 0x222838, edge: 0xffffff },
    { name: '→ Machines + systems', color: 0x1e2433, edge: 0xffffff },
  ];
  const layers = defs.map((d, i) => {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(S, TH, S);
    const slab = new THREE.Mesh(geo, mat(d.color, d.radius ? { emissive: 0x3a1806, emissiveIntensity: .6 } : {}));
    g.add(slab); g.add(edges(geo, d.edge, d.radius ? .8 : .2));
    const grid = new THREE.GridHelper(S * .999, d.radius ? 10 : 12, d.radius ? 0x8a4418 : 0x3a4256, d.radius ? 0x63300f : 0x2c3344);
    grid.position.y = TH / 2 + .002; grid.material.transparent = true; grid.material.opacity = .55; g.add(grid);
    // name on the front-left side face
    const { tex, aspect } = textCanvas(d.name, { size: 60, mono: true, color: d.radius ? '#ffb27a' : '#aab0bd', pad: 26 });
    const ph = TH * .7, side = new THREE.Mesh(new THREE.PlaneGeometry(ph * aspect, ph), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    side.position.set(-H + ph * aspect / 2 + .04, 0, H + .002); g.add(side);
    pivot.add(g); g.userData = { slab, i };
    return g;
  });
  const [L0, L1, L2, L3, L4] = layers;

  /* products (top) */
  const prodDefs = [['Chip design', -105, -110, .34], ['Space', 0, -125, .22], ['Earth data', 105, -105, .28], ['Robotics', -125, -10, .3], ['Cybersecurity', 120, 5, .18], ['Energy', -60, 100, .26], ['+ Next product', 70, 110, .12]];
  const hub = cube(L0, 0, 0, .34, .26, OR, { emissive: OR, emissiveIntensity: .7, edge: 0xffb27a, edgeOpacity: .7 });
  tag(L0, 0, 0, TH / 2 + .34, 'Radius SDK', .13, { color: '#aab0bd' });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x8ea2ff, transparent: true, opacity: .35 });
  const paths = [];
  const prods = prodDefs.map(([n, x, y, h], i) => {
    const soon = i === 6;
    const m = cube(L0, x, y, .24, h, soon ? 0x2a3040 : 0x46506a, soon ? { transparent: true, opacity: .35, edgeOpacity: .35 } : {});
    tag(L0, x, y, TH / 2 + h + .05, n, .15, { color: soon ? '#8a90a0' : '#dfe3ea' });
    const yy = TH / 2 + .01, [px, pz] = at(x, y);
    const pts = Math.abs(y) > Math.abs(x) ? [[px, pz], [px, 0], [0, 0]] : [[px, pz], [0, pz], [0, 0]];
    const v = pts.map(([a, b]) => new THREE.Vector3(a, yy, b));
    L0.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), wireMat));
    paths.push(new THREE.CurvePath()); v.slice(1).forEach((p, k) => paths[i].add(new THREE.LineCurve3(v[k], p)));
    return m;
  });
  const sparks = paths.map((p, i) => { const s = glow(.16, 0x9db0ff); L0.add(s); s.userData = { p, o: i * .37 }; return s; });

  /* people + AI agents */
  [['Design agent', 150, 60], ['Planner', 150, 0], ['Inspector', 150, -60], ['Watchdog', 150, -120]].forEach(([n, x, y]) => {
    cube(L1, x, y, .26, .2, 0x47548a, { edge: 0x8ea2ff, edgeOpacity: .5 });
    tag(L1, x, y, TH / 2 + .26, n, .12, { color: '#9aa0ae' });
  });
  cube(L1, -40, 150, .5, .08, 0x1d2233); tag(L1, -40, 150, TH / 2 + .14, 'SDK + plug-in kits', .12, { color: '#9aa0ae' });

  /* USG Radius: Ask, Check, Act, Record, the guard and the logbook */
  const stageDefs = [['Ask', -130, 150], ['Check', -50, 150], ['Act', 30, 150], ['Record', 110, 150]];
  const stageMat = () => mat(0x1a120d, { emissive: OR, emissiveIntensity: .05 });
  const stages = stageDefs.map(([n, x, y]) => {
    const [wx, wz] = at(x, y);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .04, 40), stageMat()); d.position.set(wx, TH / 2 + .02, wz); L2.add(d);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 8, 48), new THREE.MeshBasicMaterial({ color: OR, transparent: true, opacity: .7 })); r.rotation.x = Math.PI / 2; r.position.copy(d.position); L2.add(r);
    tag(L2, x, y, TH / 2 + .08, n, .15, { color: '#f0f2f5', font: '600' });
    return d;
  });
  const track = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at(-155, 150), at(150, 150), at(150, -140)].map(([a, b]) => new THREE.Vector3(a, TH / 2 + .01, b))), new THREE.LineDashedMaterial({ color: OR, dashSize: .05, gapSize: .07, transparent: true, opacity: .7 }));
  track.computeLineDistances(); L2.add(track);
  const guard = cube(L2, 150, 40, .38, .42, OR, { emissive: OR, emissiveIntensity: .8, edge: 0xffb27a, edgeOpacity: .8 });
  tag(L2, 150, 40, TH / 2 + .5, 'Guard', .14, { color: '#ffd2b0', font: '600' });
  const guardHalo = glow(1.4, 0xffffff); guardHalo.position.copy(guard.position); L2.add(guardHalo);
  const logPages = [];
  for (let k = 0; k < 5; k++) { const p = cube(L2, 150, -90, .44, .05, k === 4 ? OR : 0x3a2a20, { edge: OR, edgeOpacity: .5, emissive: k === 4 ? OR : 0x000000, emissiveIntensity: .6 }); p.position.y += k * .07; logPages.push(p); }
  const newPage = logPages[4]; newPage.userData.y = newPage.position.y;
  tag(L2, 150, -90, TH / 2 + .48, 'Logbook', .12, { color: '#9aa0ae' });

  /* shared toolbox */
  const tools = [['AI', 150, 70], ['Memory', 150, 20], ['Simulation', 150, -30], ['Design tools', 150, -80], ['Plug-in kits', 150, -130]].map(([n, x, y], k) => {
    const m = cube(L3, x, y, .24, .16 + (k % 2) * .12, 0x47548a, { edge: 0x8ea2ff, edgeOpacity: .5, emissive: OR, emissiveIntensity: 0 });
    tag(L3, x, y, TH / 2 + .34, n, .12, { color: '#9aa0ae' });
    return m;
  });

  /* machines + systems */
  const machines = [['Satellites', 150, 40], ['Robots', 150, -50], ['Chip tools', 150, -135], ['Sensors', 60, 150], ['Power grids', -40, 150]].map(([n, x, y]) => {
    const m = cube(L4, x, y, .22, .22, 0x46506a, { emissive: OR, emissiveIntensity: 0 });
    const r = new THREE.Mesh(new THREE.RingGeometry(.2, .23, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .15, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.set(m.position.x, TH / 2 + .005, m.position.z); L4.add(r);
    tag(L4, x, y, TH / 2 + .3, n, .13, { color: '#aab0bd' });
    m.userData.ring = r;
    return m;
  });

  /* the request of light */
  const orb = glow(.5, 0xffffff); orb.renderOrder = 20; orb.material.depthTest = false; pivot.add(orb);
  const beamMat = new THREE.LineBasicMaterial({ color: OR, transparent: true, opacity: 0, depthTest: false });
  const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), beamMat); beam.renderOrder = 19; pivot.add(beam);

  /* layout: gap between layers opens with scroll; layers drop in the first time */
  let gap = .95, gapTo = .95, enter = reduce ? 1 : 0, seen = reduce;
  function place() {
    layers.forEach((g, i) => {
      const k = 4 - i, drop = (1 - easeOut(clamp01(enter * 1.6 - (4 - k) * .12))) * (1.6 + k * .3);
      g.position.y = (k - 2) * gap + drop;
      g.visible = enter > (4 - k) * .07 || reduce;
    });
  }
  const clamp01 = v => Math.max(0, Math.min(1, v)), easeOut = t => 1 - Math.pow(1 - t, 3);
  const world = (obj, out = new THREE.Vector3()) => { obj.updateWorldMatrix(true, false); return obj.getWorldPosition(out).applyMatrix4(new THREE.Matrix4().copy(pivot.matrixWorld).invert()); };

  /* size: match the flat drawing it covers */
  let W = 1, Hh = 1;
  function resize() {
    const r = svg.getBoundingClientRect(), hr = host.getBoundingClientRect();
    W = Math.max(1, r.width); Hh = Math.max(1, r.height);
    cv.style.left = (r.left - hr.left) + 'px'; cv.style.top = (r.top - hr.top) + 'px';
    renderer.setSize(W, Hh, false); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    cam.aspect = W / Hh; cam.updateProjectionMatrix();
    const d = 22; cam.position.set(d * .6, d * .52, d * .6); cam.lookAt(0, .05, 0);
  }
  new ResizeObserver(resize).observe(host); resize();

  /* drag to turn, gentle drift otherwise */
  let yaw = 0, yawTo = 0, tilt = 0, dragging = false, lx = 0, lastMove = -1e9;
  cv.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', e => { if (!dragging) return; yawTo = Math.max(-.9, Math.min(.9, yawTo + (e.clientX - lx) * .006)); lx = e.clientX; lastMove = performance.now(); });
  const up = () => { dragging = false; cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.style.cursor = 'grab';

  /* the story: same controller as the flat drawing */
  let active = -1, since = 0, pair = 0;
  const pairs = [[0, 2], [1, 0], [2, 3], [3, 1], [4, 1], [5, 4]];
  function show(i) {
    if (i === active) return; active = i; since = performance.now();
    if (i === 0) pair++;
  }

  /* only draw while on screen */
  let onScreen = false;
  new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); if (onScreen) seen = true; }, { rootMargin: '100px' }).observe(host);

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!onScreen) return;
    if (seen && enter < 1) enter = Math.min(1, enter + dt * .55);
    gap += (gapTo - gap) * Math.min(1, dt * 4);
    if (!dragging && now - lastMove > 2500) yawTo *= 1 - dt * .6;
    yaw += (yawTo - yaw) * Math.min(1, dt * 6);
    pivot.rotation.y = yaw + (reduce ? 0 : Math.sin(now / 5200) * .1);
    place();
    pivot.updateMatrixWorld(true);

    const t = (now - since) / 1000, [p, m] = pairs[pair % pairs.length];
    // flow along the product wires
    sparks.forEach(s => { const u = ((now / 2200 + s.userData.o) % 1); s.position.copy(s.userData.p.getPointAt(u)); s.material.opacity = Math.sin(u * Math.PI) * .9; });
    prods.forEach((o, k) => { o.material.emissive.setHex(OR); o.material.emissiveIntensity = k === p ? .55 : 0; });
    stages.forEach((d, k) => { d.material.emissiveIntensity = k === active ? 1.1 : k < active ? .18 : .03; });
    tools.forEach((o, k) => { o.material.emissiveIntensity = active === 1 && k === pair % tools.length ? .9 : 0; });
    machines.forEach((o, k) => { const hot = active >= 2 && k === m; o.material.emissiveIntensity = hot ? .8 : 0; o.userData.ring.material.color.setHex(hot ? OR : 0xffffff); o.userData.ring.material.opacity = hot ? .8 : .15; });
    const pulse = active === 1 ? .8 + Math.sin(t * 9) * .35 : .55;
    guard.material.emissiveIntensity = pulse; guardHalo.material.opacity = active === 1 ? .9 : .45;
    world(guard, warm.position); warm.position.applyMatrix4(pivot.matrixWorld); warm.intensity = active === 1 ? 9 : 5;
    // the new logbook page drops in on Record
    const ld = active === 3 ? easeOut(clamp01(t / .5)) : 0;
    newPage.visible = active === 3; newPage.position.y = newPage.userData.y + (1 - ld) * .35;

    // request of light: Ask = product -> Check, Act = guard -> machine
    let from = null, to = null, k01 = 0;
    if (active === 0) { world(prods[p], from = tmpA); world(stages[1], to = tmpB); k01 = clamp01(t / 1.1); }
    else if (active === 1) { world(stages[1], from = tmpA); world(guard, to = tmpB); k01 = clamp01(t / .8); }
    else if (active === 2) { world(guard, from = tmpA); world(machines[m], to = tmpB); k01 = clamp01(t / 1.1); }
    if (from && enter >= 1) {
      orb.visible = true; orb.position.lerpVectors(from, to, easeOut(k01)); orb.scale.setScalar(.45 + Math.sin(now / 120) * .05);
      beam.geometry.setFromPoints([from.clone(), to.clone()]); beamMat.opacity = .55;
    } else { orb.visible = false; beamMat.opacity = 0; }
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  return {
    setProgress(pr) { gapTo = .82 + clamp01(pr) * .22; },
    setActive(i) { show(Math.max(0, Math.min(3, i))); },
  };
}
