/* USG Radius as an isometric platform. Same interface as before (setProgress, setActive), so the
   pages drive it from scroll. When nothing drives it, it plays one request on a loop:
   a product asks, USG Radius checks, a machine acts, the logbook records. */
export function mountPlatform(host) {
  if (!host) return null;
  const q = s => [...host.querySelectorAll(s)];
  const stages = q('.st'), stLabels = q('.st-lb'), tools = q('.tbi'), prods = q('.pd'), machines = q('.mc'), ask = q('.bm-ask'), act = q('.bm-act');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = -1, driven = 0, pair = 0;
  const pairs = [[0, 2], [1, 0], [2, 3], [3, 1], [4, 1], [5, 4]]; // product -> machine it acts on (Easley is not live)

  function show(i) {
    if (i === active) return;
    active = i;
    const [p, m] = pairs[pair % pairs.length];
    stages.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
    stLabels.forEach((s, k) => s.classList.toggle('on', k === i));
    tools.forEach((s, k) => s.classList.toggle('hot', i === 1 && k === pair % tools.length));
    prods.forEach((s, k) => s.classList.toggle('hot', k === p));
    ask.forEach((s, k) => s.classList.toggle('hot', k === p && i === 0));
    machines.forEach((s, k) => s.classList.toggle('hot', k === m && i >= 2));
    act.forEach((s, k) => s.classList.toggle('hot', k === m && i === 2));
    host.classList.toggle('checking', i === 1);
    host.classList.toggle('logged', i === 3);
  }

  // layers drop into place the first time the picture comes into view
  if (reduce || !('IntersectionObserver' in window)) host.classList.add('in');
  else { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { host.classList.add('in'); io.disconnect(); } }, { threshold: .2 }); io.observe(host); }

  if (reduce) show(3);
  else setInterval(() => {
    if (Date.now() - driven < 2500) return;
    const next = active >= 3 ? 0 : active + 1;
    if (next === 0) pair++;
    show(next);
  }, 1400);
  return {
    setProgress() {},
    setActive(i) { driven = Date.now(); show(Math.max(0, Math.min(3, i))); }
  };
}
