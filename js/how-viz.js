/* "How we work" visuals on the home page: a point that can only move inside its limits, and a logbook
   whose entries are each sealed with the one before. Drawn live; nothing is a video or an image. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, '0'); };

function setup(cv) {
  const g = cv.getContext('2d'); const o = { g, W: 0, H: 0, dpr: 1, on: false };
  const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  const size = () => { const r = cv.getBoundingClientRect(); o.dpr = Math.min(2, (devicePixelRatio || 1) * zoom); o.W = r.width; o.H = r.height; cv.width = o.W * o.dpr; cv.height = o.H * o.dpr; };
  new ResizeObserver(size).observe(cv); size();
  new IntersectionObserver(es => { o.on = es[0].isIntersecting; }).observe(cv);
  return o;
}
function grid(o) { const { g, W, H } = o; g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; for (let x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); } for (let y = 0; y < H; y += 24) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); } }

function bound(cv) {
  const o = setup(cv), trail = [];
  let x = .3, y = .4, vx = .23, vy = .17, last = performance.now(); const hits = [0, 0, 0, 0];
  function frame(now) {
    requestAnimationFrame(frame);
    if (!o.on && !reduce) { last = now; return; }
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    const { g, W, H, dpr } = o; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); grid(o);
    const bx = W * .16, by = H * .18, bw = W * .68, bh = H * .58;
    if (!reduce) {
      x += vx * dt; y += vy * dt;
      if (x < 0) { x = 0; vx = Math.abs(vx); hits[0] = 1; } if (x > 1) { x = 1; vx = -Math.abs(vx); hits[1] = 1; }
      if (y < 0) { y = 0; vy = Math.abs(vy); hits[2] = 1; } if (y > 1) { y = 1; vy = -Math.abs(vy); hits[3] = 1; }
      // something keeps pushing outward; the limit holds
      vx += Math.sin(now / 900) * .02 * dt; vy += Math.cos(now / 1300) * .02 * dt;
    }
    const px = bx + x * bw, py = by + y * bh; trail.push([px, py]); if (trail.length > 70) trail.shift();
    // boundary
    g.setLineDash([5, 5]); g.lineWidth = 1.4;
    const sides = [[bx, by, bx, by + bh], [bx + bw, by, bx + bw, by + bh], [bx, by, bx + bw, by], [bx, by + bh, bx + bw, by + bh]];
    sides.forEach((s, k) => { hits[k] = Math.max(0, hits[k] - dt * 1.4); g.strokeStyle = `rgba(232,97,26,${.45 + hits[k] * .55})`; g.shadowColor = 'rgba(232,97,26,.9)'; g.shadowBlur = hits[k] * 16; g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.stroke(); });
    g.setLineDash([]); g.shadowBlur = 0;
    g.fillStyle = 'rgba(232,97,26,.05)'; g.fillRect(bx, by, bw, bh);
    // trail
    for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(150,180,255,${i / trail.length * .7})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(...trail[i - 1]); g.lineTo(...trail[i]); g.stroke(); }
    g.fillStyle = 'rgba(150,180,255,.25)'; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill();
    g.fillStyle = '#dfe6ff'; g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill();
    g.font = '500 10px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(240,128,64,.85)'; g.fillText('LIMIT', bx, by - 8);
  }
  requestAnimationFrame(frame);
}

function chain(cv) {
  const o = setup(cv); let blocks = [], n = 0, prev = '0', t0 = performance.now(), offset = 0;
  const add = () => { const id = 'EV-' + String(1000 + n++).padStart(6, '0'); prev = hash(prev + id); blocks.push({ id, h: prev, born: performance.now() }); if (blocks.length > 7) blocks.shift(); };
  for (let i = 0; i < 3; i++) add();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!o.on && !reduce) return;
    if (!reduce && now - t0 > 1700) { t0 = now; add(); }
    const { g, W, H, dpr } = o; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); grid(o);
    const bw = Math.min(150, W * .42), bh = 64, gap = 26, cy = H * .5 - bh / 2;
    const target = W * .56 - (blocks.length - 1) * (bw + gap);
    offset += (target - offset) * .08;
    blocks.forEach((b, i) => {
      const x = offset + i * (bw + gap), age = Math.min(1, (now - b.born) / 600), newest = i === blocks.length - 1;
      const yy = cy - (1 - age) * 30;
      if (i > 0) { g.strokeStyle = 'rgba(232,97,26,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - gap, yy + bh / 2); g.lineTo(x, yy + bh / 2); g.stroke(); g.fillStyle = '#f08040'; g.beginPath(); g.arc(x - gap / 2, yy + bh / 2, 2.4, 0, 7); g.fill(); }
      g.globalAlpha = age;
      g.fillStyle = newest ? 'rgba(232,97,26,.14)' : 'rgba(255,255,255,.04)'; g.strokeStyle = newest ? 'rgba(232,97,26,.85)' : 'rgba(255,255,255,.18)';
      g.lineWidth = 1.2; g.beginPath(); g.roundRect(x, yy, bw, bh, 10); g.fill(); g.stroke();
      g.font = '600 12px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = '#f0f2f5'; g.fillText(b.id, x + 12, yy + 24);
      g.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(240,242,245,.55)'; g.fillText('seal ' + b.h, x + 12, yy + 45);
      g.globalAlpha = 1;
    });
  }
  requestAnimationFrame(frame);
}

export function mountHowViz() {
  document.querySelectorAll('canvas[data-viz="bound"]').forEach(bound);
  document.querySelectorAll('canvas[data-viz="chain"]').forEach(chain);
}
