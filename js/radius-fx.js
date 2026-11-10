/* USG Radius page: the hero console, the request pipeline, the twin simulation and the globe.
   Every logbook code on this page is a real SHA-256, computed in the browser from the entry before it. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

async function sha(text) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, '0').repeat(8); }
}
let prevHash = '0'.repeat(64), seq = 418;
async function logEntry(text) { prevHash = await sha(prevHash + '|' + text); return { id: 'EV-' + String(seq++).padStart(6, '0'), hash: prevHash }; }

const icons = {
  machine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M9 9V5h6v4M8 14h2m4 0h2"/></svg>',
  agent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.2 4.6L19 8.3l-3.5 3.3.9 4.9L12 14.2l-4.4 2.3.9-4.9L5 8.3l4.8-.7z"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>',
  orbit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-25 12 12)"/></svg>'
};

/* ---------- hero console ---------- */
export function mountConsole(root) {
  if (!root) return;
  const q = s => root.querySelector(s);
  const segs = [...root.querySelectorAll('.seg')], checks = [...root.querySelectorAll('.c-checks li')];
  const CIRC = 2 * Math.PI * 80, SEG = CIRC / 4 - 14;
  segs.forEach((s, i) => s.setAttribute('transform', `rotate(${-90 + i * 90 + 3.6} 100 100)`));
  const clock = q('.clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); };
  tick(); setInterval(tick, 1000);
  const reqs = [
    { who: 'Robot arm, cell 4', kind: 'Machine', ic: 'machine', act: 'Load a new part program', fail: -1 },
    { who: 'Design agent', kind: 'AI agent', ic: 'agent', act: 'Send a chip layout to fabrication', fail: 3, why: 'Version not approved' },
    { who: 'Satellite LS-2', kind: 'Machine', ic: 'orbit', act: 'Fire thrusters to avoid a collision', fail: -1 },
    { who: 'Grid controller', kind: 'Machine', ic: 'machine', act: 'Move load to the reserve feeder', fail: 2, why: 'Outside the limits' },
    { who: 'Plant operator', kind: 'Person', ic: 'person', act: 'Deploy configuration 7.2', fail: -1 }
  ];
  const chain = q('#chain');
  let i = 0, visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
  async function run() {
    const r = reqs[i++ % reqs.length];
    root.classList.add('swapping'); root.classList.remove('ok', 'no');
    await wait(380);
    q('#cwho').textContent = r.who; q('#ckind').textContent = r.kind; q('.c-who .av').innerHTML = icons[r.ic]; q('#cact').textContent = r.act;
    checks.forEach(li => { li.className = ''; li.querySelector('em').textContent = 'waiting'; });
    segs.forEach(s => { s.classList.remove('no'); s.style.strokeDasharray = `0 ${CIRC}`; });
    q('#cv').textContent = 'Checking'; q('#cvs').textContent = 'step 0 of 4';
    root.classList.remove('swapping');
    await wait(500);
    const words = ['known', 'granted', 'inside', 'matches'];
    for (let k = 0; k < 4; k++) {
      const li = checks[k];
      if (r.fail >= 0 && k > r.fail) { li.classList.add('skip'); li.querySelector('em').textContent = 'not reached'; continue; }
      li.querySelector('em').textContent = 'checking';
      await wait(420);
      const bad = k === r.fail;
      li.classList.add(bad ? 'fail' : 'done'); li.querySelector('em').textContent = bad ? r.why.toLowerCase() : words[k];
      segs[k].classList.toggle('no', bad); segs[k].style.strokeDasharray = `${SEG} ${CIRC}`;
      q('#cvs').textContent = `step ${k + 1} of 4`;
      await wait(260);
    }
    const ok = r.fail < 0;
    root.classList.add(ok ? 'ok' : 'no');
    q('#cv').textContent = ok ? 'Allowed' : 'Refused';
    const e = await logEntry(`${r.who}|${r.act}|${ok ? 'allowed' : 'refused'}`);
    q('#cvs').textContent = e.id;
    const b = document.createElement('div'); b.className = 'blk ' + (ok ? 'ok' : 'no');
    b.innerHTML = `<b>${e.id}</b><span>${e.hash.slice(0, 12)}</span>`;
    chain.appendChild(b); while (chain.children.length > 5) chain.firstElementChild.remove();
    if (reduce) return;
    await wait(2300);
    while (!visible) await wait(500);
    run();
  }
  run();
}

/* ---------- see it work: the request pipeline ---------- */
export function mountPipeline(root) {
  if (!root) return;
  const nodes = [...root.querySelectorAll('.node')], svg = root.querySelector('svg.track');
  const rail = svg.querySelector('.rail'), lit = svg.querySelector('.lit'), pkt = svg.querySelector('.pkt');
  const verdict = document.getElementById('verdict'), toggles = [...document.querySelectorAll('.toggle button')];
  const modes = {
    allow: { line: ['Plant operator', 'Deploy configuration 7.2', 'Line controller'], res: ['received', 'permission active', 'inside every limit', 'allowed', 'signed'], stop: -1,
      title: 'Allowed', text: 'The operator has an active permission, configuration 7.2 is the approved version and every value is inside its limits, so the change goes ahead.' },
    refuse: { line: ['Plant operator', 'Deploy configuration 7.3', 'Line controller'], res: ['received', 'permission active', '7.3 is not approved', 'refused', 'signed'], stop: 2,
      title: 'Refused', text: 'Same operator, same permission, but configuration 7.3 was never approved. It stops at the limits check and never reaches the line. The refusal is signed into the logbook too.' }
  };
  let len = 1, pts = [];
  function layout() {
    const r = root.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    pts = nodes.map(n => { const c = n.querySelector('.ic').getBoundingClientRect(); return [c.left + c.width / 2 - r.left, c.top + c.height / 2 - r.top]; });
    const d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
    rail.setAttribute('d', d); lit.setAttribute('d', d);
    len = rail.getTotalLength();
    lit.style.strokeDasharray = `${len} ${len}`;
  }
  new ResizeObserver(layout).observe(root); layout();
  const segLen = k => { // path length up to node k
    let L = 0; for (let j = 1; j <= k; j++) L += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); return L; };
  let token = 0;
  function animateTo(from, to, ms, my) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (my !== token) return res(false);
        const u = reduce ? 1 : Math.min(1, (now - t0) / ms), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, L = from + (to - from) * e;
        const p = rail.getPointAtLength(L); pkt.setAttribute('cx', p.x); pkt.setAttribute('cy', p.y);
        lit.style.strokeDashoffset = len - L;
        if (u < 1) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }
  async function play(m) {
    const my = ++token, M = modes[m];
    toggles.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
    root.classList.toggle('refused', false);
    document.querySelectorAll('#reqline b').forEach((b, k) => { b.textContent = M.line[k]; });
    nodes.forEach(n => { n.classList.remove('hit', 'stop', 'dim'); n.querySelector('.res').textContent = ''; });
    verdict.classList.remove('ok', 'no'); verdict.style.opacity = .35;
    lit.style.strokeDashoffset = len; pkt.style.opacity = 1;
    let at = 0;
    for (let k = 0; k < nodes.length; k++) {
      const L = segLen(k);
      if (!(await animateTo(at, L, k ? 700 : 300, my))) return;
      at = L;
      const n = nodes[k], bad = k === M.stop || (M.stop >= 0 && k === 3);
      if (bad) { root.classList.add('refused'); n.classList.add('stop'); } else n.classList.add('hit');
      n.querySelector('.res').textContent = M.res[k];
      if (k === 4) {
        const e = await logEntry(M.line.join('|') + '|' + M.title);
        if (my !== token) return;
        n.querySelector('.res').textContent = e.id + ' signed';
        document.getElementById('vt').textContent = M.title;
        document.getElementById('vd').textContent = M.text;
        document.getElementById('ve').textContent = e.id;
        document.getElementById('vh').textContent = 'sha256 ' + e.hash.slice(0, 16);
        verdict.classList.add(M.stop < 0 ? 'ok' : 'no'); verdict.style.opacity = 1;
      }
      await wait(bad && k === M.stop ? 900 : 260);
    }
    pkt.style.opacity = 0;
  }
  toggles.forEach(b => b.addEventListener('click', () => play(b.dataset.mode)));
  document.getElementById('replay')?.addEventListener('click', () => play(toggles.find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.mode || 'allow'));
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); play('allow'); } }, { threshold: .35 });
  io.observe(root);
}

/* ---------- try it first: the twin plays out paths before anything runs ---------- */
export function mountTwin(root) {
  if (!root) return;
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), state = root.querySelector('.tw-state');
  const boxes = [...document.querySelectorAll('.three.steps3 .box')];
  const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  let W = 0, H = 0, dpr = 1;
  function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, (devicePixelRatio || 1) * zoom); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; }
  new ResizeObserver(size).observe(cv); size();
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let paths = [], t0 = performance.now(), phase = -1, onScreen = false, loop = 0;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(root);
  const N = 9;
  function newRun() {
    seed = 7 + loop++ * 13; paths = [];
    for (let i = 0; i < N; i++) {
      const spread = (i / (N - 1) - .5) * 2; // -1..1
      const wob = (rnd() - .5) * .5, end = spread * .78 + wob * .35;
      paths.push({ spread, wob, end, fq: 1.5 + rnd() * 2.5, ph: rnd() * 6 });
    }
    t0 = performance.now(); phase = -1;
  }
  newRun();
  const limY = () => H * (W < 600 ? .26 : .22), x0 = () => W * .1, x1 = () => W * .74, gx = () => W * .88, midY = () => H * .55;
  const yAt = (p, u) => midY() - (p.end * u * u * .9 + Math.sin(u * p.fq * 3 + p.ph) * p.wob * .12 * u) * H * .55;
  function setPhase(k) {
    if (k === phase) return; phase = k;
    boxes.forEach((b, i) => { b.classList.toggle('on', i === k); b.style.setProperty('--dur', ['1.2s', '3.4s', '2.2s'][i]); });
    const bad = paths.filter(p => Math.min(...[...Array(21)].map((_, j) => yAt(p, j / 20))) < limY()).length;
    root.classList.toggle('flag', k === 1); root.classList.toggle('pass', k === 2);
    state.textContent = k === 0 ? 'Proposed action received' : k === 1 ? `Simulating ${N} possible paths` : `${bad} of ${N} paths cross a limit. The safe plan goes to the check`;
  }
  function draw(now) {
    requestAnimationFrame(draw);
    if (!onScreen && !reduce) return;
    const T = reduce ? 7 : (now - t0) / 1000;
    if (T > 8.2) { newRun(); return; }
    setPhase(T < 1.2 ? 0 : T < 4.6 ? 1 : 2);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    // grid
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // the limit
    const ly = limY();
    const lg = g.createLinearGradient(0, 0, 0, ly); lg.addColorStop(0, 'rgba(232,97,26,.16)'); lg.addColorStop(1, 'rgba(232,97,26,.03)');
    g.fillStyle = lg; g.fillRect(0, 0, W, ly);
    g.setLineDash([6, 6]); g.strokeStyle = 'rgba(232,97,26,.7)'; g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke(); g.setLineDash([]);
    g.font = '500 11px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(240,128,64,.9)'; g.fillText('LIMIT', 16, ly - 8);
    // origin
    const ox = x0(), oy = midY();
    const pulse = (Math.sin(now / 300) + 1) / 2;
    g.fillStyle = 'rgba(91,141,238,.15)'; g.beginPath(); g.arc(ox, oy, 16 + pulse * 6, 0, 7); g.fill();
    g.fillStyle = '#5b8dee'; g.beginPath(); g.arc(ox, oy, 6, 0, 7); g.fill();
    // paths
    const grow = Math.max(0, Math.min(1, (T - 1.2) / 3));
    const ease = 1 - Math.pow(1 - grow, 3);
    let safe = null;
    paths.forEach(p => {
      const n = 60, upto = Math.max(1, Math.floor(n * ease));
      let crossed = -1;
      g.beginPath();
      for (let j = 0; j <= upto; j++) {
        const u = j / n, x = ox + (x1() - ox) * u, y = yAt(p, u);
        if (crossed < 0 && y < ly) crossed = j;
        j ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      const bad = crossed >= 0;
      g.strokeStyle = bad ? 'rgba(240,128,64,.85)' : 'rgba(140,170,255,.55)'; g.lineWidth = bad ? 1.6 : 1.3;
      if (T > 4.6 && bad) g.strokeStyle = 'rgba(240,128,64,.35)';
      g.stroke();
      const u = upto / n, hx = ox + (x1() - ox) * u, hy = yAt(p, u);
      if (grow < 1) { g.fillStyle = bad ? '#f08040' : '#c9d6ff'; g.beginPath(); g.arc(hx, hy, 2.6, 0, 7); g.fill(); }
      if (bad && crossed <= upto) { // mark where it crosses
        const cu = crossed / n, cx = ox + (x1() - ox) * cu, cy = yAt(p, cu);
        g.strokeStyle = '#f08040'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx - 5, cy - 5); g.lineTo(cx + 5, cy + 5); g.moveTo(cx + 5, cy - 5); g.lineTo(cx - 5, cy + 5); g.stroke();
      }
      if (!bad && (!safe || Math.abs(p.end) < Math.abs(safe.end))) safe = p;
    });
    // the gate: the permission check
    const gX = gx(), gY = midY();
    const on = T > 4.6, k = Math.max(0, Math.min(1, (T - 4.6) / 1.2));
    if (on && safe) {
      g.strokeStyle = 'rgba(74,222,128,.9)'; g.lineWidth = 2.4; g.shadowColor = 'rgba(74,222,128,.8)'; g.shadowBlur = 12;
      g.beginPath();
      for (let j = 0; j <= 60; j++) { const u = j / 60, x = ox + (x1() - ox) * u, y = yAt(safe, u); j ? g.lineTo(x, y) : g.moveTo(x, y); }
      const ex = x1(), ey = yAt(safe, 1);
      g.lineTo(ex + (gX - ex) * k, ey + (gY - ey) * k); g.stroke(); g.shadowBlur = 0;
    }
    g.strokeStyle = on && k >= 1 ? 'rgba(74,222,128,.9)' : 'rgba(255,255,255,.3)'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(gX - 14, gY - 34, 28, 68, 8); g.stroke();
    g.fillStyle = on && k >= 1 ? 'rgba(74,222,128,.18)' : 'rgba(255,255,255,.04)'; g.fill();
    g.fillStyle = 'rgba(240,242,245,.75)'; g.textAlign = 'center'; g.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    if (W > 520) { g.fillText('PERMISSION', gX, gY + 54); g.fillText('CHECK', gX, gY + 68); }
    g.textAlign = 'left';
  }
  requestAnimationFrame(draw);
}

/* ---------- the globe in the closing band ---------- */
export async function mountGlobe(host) {
  if (!host) return;
  let THREE, LAND;
  try { THREE = await import('three'); ({ LAND } = await import('./land-dots.js')); } catch (e) { return; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  if (!renderer.getContext()) return;
  const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  renderer.setPixelRatio(Math.min(2, (devicePixelRatio || 1) * zoom));
  host.appendChild(renderer.domElement);
  host.closest('.contact')?.classList.add('globe-on');
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const world = new THREE.Group(); scene.add(world);
  world.rotation.x = .38;
  const R = 1;
  // body
  world.add(new THREE.Mesh(new THREE.SphereGeometry(R * .995, 96, 64), new THREE.MeshBasicMaterial({ color: 0x0b0e15 })));
  // land points
  const raw = Uint8Array.from(atob(LAND), c => c.charCodeAt(0)), dv = new DataView(raw.buffer);
  const n = raw.length / 4, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const ll = (lat, lon, r = R) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return [r * Math.cos(a) * Math.sin(o), r * Math.sin(a), r * Math.cos(a) * Math.cos(o)]; };
  for (let i = 0; i < n; i++) {
    const lat = dv.getInt16(i * 4, true) / 100, lon = dv.getInt16(i * 4 + 2, true) / 100, p = ll(lat, lon);
    pos.set(p, i * 3);
    const warm = Math.random() < .06; col.set(warm ? [0.95, 0.5, 0.25] : [0.55, 0.6, 0.72], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  world.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: .011, vertexColors: true, transparent: true, opacity: .95, sizeAttenuation: true })));
  // atmosphere rim
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(max(0., 0.62 - dot(vN, vec3(0.,0.,1.))), 2.4); gl_FragColor = vec4(0.91,0.38,0.1,1.) * i * 0.9; }'
  }));
  scene.add(rim);
  // routes between places: orange arcs that draw themselves
  const places = [[6.5, 3.4], [-1.3, 36.8], [5.6, -0.2], [51.5, -0.1], [40.7, -74], [37.8, -122.4], [28.6, 77.2], [35.7, 139.7], [-33.9, 18.4], [25.2, 55.3], [1.35, 103.8], [-23.5, -46.6], [48.9, 2.35], [9.06, 7.49]];
  const arcs = [];
  const arcMat = () => new THREE.LineBasicMaterial({ color: 0xf08040, transparent: true, opacity: .9 });
  function makeArc() {
    const a = places[Math.floor(Math.random() * places.length)]; let b = a; while (b === a) b = places[Math.floor(Math.random() * places.length)];
    const va = new THREE.Vector3(...ll(...a)), vb = new THREE.Vector3(...ll(...b)), pts = [];
    const h = .15 + va.distanceTo(vb) * .22;
    for (let i = 0; i <= 64; i++) { const t = i / 64, v = va.clone().lerp(vb, t).normalize().multiplyScalar(R + Math.sin(Math.PI * t) * h); pts.push(v); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setDrawRange(0, 0);
    const line = new THREE.Line(geo, arcMat()); world.add(line);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); world.add(head);
    arcs.push({ line, geo, pts, head, t: 0, life: 2.6 + Math.random() * 1.2 });
  }
  for (let i = 0; i < 5; i++) { makeArc(); arcs[i].t = -i * .7; }
  // orbits and satellites
  const sats = [];
  [[1.28, .5, .2], [1.38, -.35, 1.1], [1.5, 1.1, 2.3]].forEach(([r, tilt, rot], k) => {
    const g = new THREE.Group(); g.rotation.set(tilt, rot, 0); world.add(g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .0016, 6, 200), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14 }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    const s = new THREE.Mesh(new THREE.BoxGeometry(.028, .028, .028), new THREE.MeshBasicMaterial({ color: k === 1 ? 0xf08040 : 0xdfe6ff })); g.add(s);
    sats.push({ s, r, sp: .25 + k * .08, ph: k * 2 });
  });
  function size() {
    const r = host.getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
    // place the globe so its top rises from the bottom of the band
    const fit = Math.max(1, 1.25 / cam.aspect);
    cam.position.set(0, 0, 3.4 * fit); cam.lookAt(0, 0, 0);
    const vis = 2 * cam.position.z * Math.tan(15 * Math.PI / 180);
    world.position.y = rim.position.y = vis * .5 - vis * .2 - R; // globe top a fifth of the way down the canvas
  }
  new ResizeObserver(size).observe(host); size();
  let on = false; new IntersectionObserver(es => { on = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(host);
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!on) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduce) world.rotation.y += dt * .06;
    arcs.forEach((a, i) => {
      a.t += reduce ? 0 : dt / a.life;
      const t = Math.max(0, a.t), drawn = Math.floor(Math.min(1, t * 1.6) * 64), tail = Math.max(0, Math.floor((t * 1.6 - 1) * 64));
      a.geo.setDrawRange(tail, Math.max(0, drawn - tail + 1));
      const hp = a.pts[Math.min(64, drawn)]; a.head.position.copy(hp); a.head.visible = t > 0 && drawn < 64;
      if (a.t > 1.3) { world.remove(a.line, a.head); a.geo.dispose(); arcs.splice(i, 1); makeArc(); }
    });
    sats.forEach(o => { const a = now / 1000 * o.sp + o.ph; o.s.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); o.s.rotation.y = a; });
    renderer.render(scene, cam);
  }
  if (reduce) arcs.forEach(a => { a.t = .6; });
  requestAnimationFrame(frame);
}
