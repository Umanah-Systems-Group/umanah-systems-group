/* USG Radius as a platform. Same interface the old chip model had (setProgress, setActive),
   so the pages drive it from scroll. When nothing drives it, it plays a request on a loop. */
export function mountPlatform(host) {
  if (!host) return null;
  const stages = [...host.querySelectorAll('.pf-stage')];
  const prods = [...host.querySelectorAll('.pf-top .pf-items span')];
  const machines = [...host.querySelectorAll('.pf-bot .pf-items span')];
  const ev = host.querySelector('.pf-log b');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = -1, driven = 0, n = 0, pair = 0;
  const pairs = [[0, 2], [1, 0], [2, 3], [3, 1], [4, 1], [5, 4]]; // product -> machine it acts on

  function show(i) {
    if (i === active) return;
    active = i;
    const [p, m] = pairs[pair % pairs.length];
    stages.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
    prods.forEach((s, k) => s.classList.toggle('hot', k === p && i >= 0));
    machines.forEach((s, k) => s.classList.toggle('hot', k === m && i >= 2));
    host.classList.remove('pf-go1', 'pf-go2');
    void host.offsetWidth;
    if (i === 0) host.classList.add('pf-go1');
    if (i === 2) host.classList.add('pf-go2');
    host.classList.toggle('logged', i === 3);
    if (i === 3 && ev) ev.textContent = 'Signed · EV-' + String(418 + n).padStart(6, '0');
  }

  if (reduce) { show(3); }
  else {
    setInterval(() => {
      if (Date.now() - driven < 2500) return;
      const next = active >= 3 ? 0 : active + 1;
      if (next === 0) { pair++; n++; }
      show(next);
    }, 1300);
  }
  return {
    setProgress() {},
    setActive(i) { driven = Date.now(); show(Math.max(0, Math.min(3, i))); }
  };
}
