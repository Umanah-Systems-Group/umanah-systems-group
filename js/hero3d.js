/* Hero: a spacecraft modelled in Blender (gold blanket, radiators, solar wings, high-gain dish, imager),
   floating above a lit Earth limb. Drag to turn it; it settles back into a slow drift. */
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

export function mountHero(host) {
  if (!host) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zoom = innerWidth >= 2500 ? 1.33 : innerWidth >= 2200 ? 1.2 : 1;
  // phones get a lighter scene: iOS gives a tab little graphics memory
  const light = innerWidth <= 960 || matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, light ? 1.75 : 2) * zoom);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); host.classList.remove('ready'); host.classList.add('failed'); });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !light; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = env;

  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 400);

  // sunlight: hard, warm-white, from upper left behind; earthshine: soft blue from below
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.4); sun.position.set(-6, 5, 3); scene.add(sun);
  sun.castShadow = !light; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 });
  const earthshine = new THREE.DirectionalLight(0x6f9bff, 0.9); earthshine.position.set(0, -6, 2); scene.add(earthshine);
  const rim = new THREE.DirectionalLight(0xffa060, 1.4); rim.position.set(5, 1, -6); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x223044, 0.35));

  /* Earth */
  const tl = new THREE.TextureLoader();
  const base = 'assets/';
  const earthMap = tl.load(base + (light ? 'earth_m.jpg' : 'earth.jpg')); earthMap.colorSpace = THREE.SRGBColorSpace; earthMap.anisotropy = light ? 4 : 8;
  const earthN = tl.load(base + 'earth_n.jpg');
  const clouds = tl.load(base + (light ? 'clouds_m.jpg' : 'clouds.jpg'));
  const R = 60;
  const earthGroup = new THREE.Group(); scene.add(earthGroup);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, map: earthMap, normalMap: earthN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.85, metalness: 0 }));
  earthGroup.add(earth);
  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 128, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: clouds, transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 }));
  earthGroup.add(cloudMesh);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.014, 128, 96), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { sunDir: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform vec3 sunDir; varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1. - abs(dot(vN, v)), 0., 1.), 3.2); float lit = clamp(dot(-vN, sunDir)*.8+.45, 0., 1.); vec3 c = mix(vec3(.25,.5,1.), vec3(1.,.55,.25), .25); gl_FragColor = vec4(c, f*lit*0.9); }',
  }));
  earthGroup.add(atmo);
  earthGroup.rotation.set(1.05, 0, 0.12); const LON = +(new URLSearchParams(location.search).get('lon') || 0.9); earth.rotation.y = LON; cloudMesh.rotation.y = LON;

  /* stars */
  const sg = new THREE.BufferGeometry(); const sp = []; const sc = [];
  for (let i = 0; i < 1600; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(180);
    if (v.z > 40) v.z = -v.z;
    sp.push(v.x, v.y, v.z); const b = 0.5 + Math.random() * 0.5; sc.push(b, b, b * (0.9 + Math.random() * 0.2));
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true, depthWrite: false }));
  scene.add(stars);

  /* spacecraft */
  const pivot = new THREE.Group(); scene.add(pivot);
  const craft = new THREE.Group(); pivot.add(craft);
  let loaded = false;
  loadModel('satellite', g => {
    const m = g.scene;
    m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.envMapIntensity = /MLI|Aluminium|Solar|Radiator/.test(o.material.name) ? 1.1 : 0.5; } });
    // centre it
    const box = new THREE.Box3().setFromObject(m); const c = box.getCenter(new THREE.Vector3());
    m.position.sub(c);
    craft.add(m); loaded = true;
    host.classList.add('ready');
  }, e => { console.warn('satellite model failed', e); host.classList.add('failed'); });

  /* sizing */
  let W = 1, H = 1, layout = 'wide';
  function size() {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    cam.aspect = W / H; layout = innerWidth <= 960 ? 'narrow' : 'wide';
    cam.fov = layout === 'narrow' ? 34 : 28; cam.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(host);

  /* drag to turn, with inertia; touch keeps vertical page scroll */
  let yaw = 0.6, pitch = 0.18, vYaw = 0, vPitch = 0, dragging = false, lx = 0, ly = 0, idle = 0;
  const el = renderer.domElement;
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; el.style.cursor = 'grabbing'; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    vYaw = dx * 0.006; vPitch = dy * 0.004; yaw += vYaw; pitch = Math.max(-0.9, Math.min(0.9, pitch + vPitch)); idle = 0;
  });
  const up = () => { dragging = false; el.style.cursor = 'grab'; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  let mx = 0, my = 0, pmx = 0, pmy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  let visible = true, running = true, scrollK = 0;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(host);
  const clock = new THREE.Clock();
  const sunDir = new THREE.Vector3();

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!dragging) {
      yaw += vYaw; pitch += vPitch; vYaw *= 0.94; vPitch *= 0.9; idle += dt;
      if (!reduce) yaw += dt * 0.07 * Math.min(1, idle / 2);
      pitch += (0.18 - pitch) * dt * 0.4 * Math.min(1, idle / 2);
    }
    pmx += (mx - pmx) * 0.04; pmy += (my - pmy) * 0.04;
    craft.rotation.set(pitch, yaw, reduce ? 0 : Math.sin(t * 0.3) * 0.04);

    const camZ = layout === 'wide' ? 9.5 : 10.5;
    const visH = 2 * camZ * Math.tan(cam.fov * Math.PI / 360), visW = visH * cam.aspect;
    sun.target = pivot; pivot.position.set(layout === 'wide' ? visW * 0.265 : 0, (layout === 'wide' ? 0.35 : 0.55) + (reduce ? 0 : Math.sin(t * 0.6) * 0.06), 0);
    const s = layout === 'wide' ? Math.min(0.92, visW / 14) : Math.min(1, visW / 8.6);
    pivot.scale.setScalar(s * (1 + scrollK * 0.25));

    earthGroup.position.set(layout === 'wide' ? visW * 0.12 : 0, -R - (layout === 'wide' ? 9.2 : 7.4) + scrollK * 2, -22);
    if (!reduce) { earth.rotation.y = LON + t * 0.004; cloudMesh.rotation.y = LON + t * 0.006; }
    sunDir.copy(sun.position).normalize(); atmo.material.uniforms.sunDir.value.copy(sunDir).negate();

    cam.position.set(pmx * 0.5, 0.6 - pmy * 0.3, camZ - scrollK * 1.4);
    cam.lookAt(pmx * 0.2, 0.15, 0);
    stars.rotation.y = t * 0.002;
    renderer.render(scene, cam);
  }
  frame();

  return {
    setExplode(v) { scrollK = v; },
    destroy() { running = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
  };
}
