'use strict';
// Mountain Pass (3D drive): a winding, rolling road up a high valley at alpenglow. Giant
// snow peaks rise on both sides and slide past, the great range fills the horizon, snowy
// pines and boulders crowd the roadside, and now and then a string of prayer flags spans
// the road overhead.

let dmtn;

function genDriveMountains(seed, loop) {
  let r = rng(seed * 7717 + 3);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 32, curve: 3.2, hill: 0.12 });
  const sunLeft = r() < 0.5;
  const peakC = { litRock: '#c47a88', litRockLow: '#7a4462', shRock: '#262856', shRockLow: '#141634', litSnow: '#fff0e6', shSnow: '#5e6eae', litRib: '#7a3a5e', shRib: '#10122a', arete: '#ffffff', haze: '#8a7ab0', hazeA: 0.1 };

  // Peak sprites: pre-rendered with the same faces, snow and ribs as the Himalaya scene.
  const peaks = Array.from({ length: 4 }, () => dSprite(1400, 800, 26000, g => {
    const p = genPeak(r, 700, 40 + r() * 80, 800, 560 + r() * 120, 560 + r() * 120);
    drawPeak(g, p, peakC, sunLeft, 1);
  }));
  const pines = [pineSprite(r, true), pineSprite(r, true), pineSprite(r, false)];
  const rocks = [rockSprite(r, ['#3a3a52', '#8888a8']), rockSprite(r, ['#2e2e44', '#7070a0'])];

  for (let i = 0; i < T.n; i++) {
    const s = T.segs[i];
    for (const side of [-1, 1]) {
      { const it = place(r, 0.55, () => ({ type: 'pine', x: side * (1.3 + r() ** 2 * 5), v: Math.floor(r() * 3), sc: 0.7 + r() * 0.8, f: r() })); if (it) s.items.push(it); }
      { const it = place(r, 0.05, () => ({ type: 'rock', x: side * (1.3 + r() * 2), v: Math.floor(r() * 2), sc: 0.6 + r() * 1.2 })); if (it) s.items.push(it); }
    }
    { const it = place(r, 1 / 23, () => ({ type: 'peak', x: (r() < 0.5 ? -1 : 1) * (9 + r() * 12), v: Math.floor(r() * 4), sc: 0.6 + r() * 0.8 })); if (it) s.items.push(it); }
  }
  // Everything below gets its own random sequence, so it stays put when Density changes
  // how many roadside objects were placed above.
  r = rng(seed * 7717 + 4);
  // Prayer flags across the road, only twice per lap.
  for (let j = 0; j < 2; j++) T.segs[Math.floor(((j + 0.3 + r() * 0.4) / 2) * T.n)].items.push({ type: 'flags' });

  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.5);
    gr.addColorStop(0, '#04081a'); gr.addColorStop(0.55, '#121a44'); gr.addColorStop(0.85, '#5a3e74'); gr.addColorStop(1, '#d89088');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.5 + 2);
    g.fillStyle = '#1a2038'; g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle = '#e0e8ff';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + r() * 0.4; g.fillRect(r() * W, r() * 0.22 * H, 2 * k + 1, 2 * k + 1); }
    g.globalAlpha = 1;
  });
  // The great range on the horizon, tiling one screen width so it can slide with the curves.
  const range = paintLayer(g => {
    const ps = Array.from({ length: 7 }, (_, i) => { const hN = 0.12 + r() * 0.2; return genPeak(r, ((i + r()) / 7) * W, 0.5 * H - hN * H, 0.52 * H, hN * H * (1.2 + r() * 0.6), hN * H * (1.2 + r() * 0.6)); })
      .sort((a, b) => a.base - a.top - (b.base - b.top));
    for (const dx of [-W, 0, W]) for (const p of ps) drawPeak(g, { ...p, x: p.x + dx, L: p.L.map(([x, y]) => [x + dx, y]), R: p.R.map(([x, y]) => [x + dx, y]), A: p.A.map(([x, y]) => [x + dx, y]) }, peakC, sunLeft, k);
  });

  dmtn = { T, peaks, pines, rocks, sky, range, k, FLAG: ['#3a6aff', '#f4f4f4', '#ff3a3a', '#3ac85a', '#ffd03a'] };
}

function drawDriveMountains(u) {
  const g = sctx, M = dmtn, W = GW;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, M.T, u, {
    horizon: 0.5, camH: 1200, camX: 0.3, traffic: [],
    sky(g, u, bg) { blit(g, M.sky); blitTile(g, M.range, bg * W * 0.004); },
    segment(g, a, b) {
      const alt = Math.floor(a.s.i / 4) % 2;
      dStrip(g, a, b, -60, 60, alt ? '#a898b8' : '#9a8aac');
      dStrip(g, a, b, -1.15, 1.15, alt ? '#e8e8f4' : '#7a6a8a');
      dStrip(g, a, b, -1, 1, alt ? '#3a3a48' : '#363644');
      if (alt) dStrip(g, a, b, -0.02, 0.02, '#e8e8f0');
    },
    item(g, it, pos, vis, n, u) {
      const X = pos.X + it.x * pos.R;
      if (it.type === 'pine') dDraw(g, M.pines[it.v], X, pos.Y, pos.K, pos.fade, false, it.sc);
      else if (it.type === 'rock') dDraw(g, M.rocks[it.v], X, pos.Y, pos.K, pos.fade, false, it.sc);
      else if (it.type === 'peak') { const spr = M.peaks[it.v]; dDraw(g, spr, X + Math.sign(it.x) * (spr.wW * pos.K * it.sc) * 0.4, pos.Y + 300 * pos.K, pos.K, pos.fade * 0.95, it.x < 0, it.sc); }
      else if (it.type === 'flags') {
        const ax = pos.X - 1.25 * pos.R, bx = pos.X + 1.25 * pos.R, top = pos.Y - 2400 * pos.K;
        g.globalAlpha = pos.fade; g.fillStyle = '#2a1e18';
        for (const x of [ax, bx]) g.fillRect(x - 30 * pos.K, top, 60 * pos.K, 2400 * pos.K);
        g.strokeStyle = '#3a3036'; g.lineWidth = Math.max(1, 12 * pos.K);
        const at = t => [ax + (bx - ax) * t, top + Math.sin(Math.PI * t) * 500 * pos.K];
        g.beginPath(); for (let i = 0; i <= 16; i++) { const [x, y] = at(i / 16); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        for (let i = 0; i < 12; i++) {
          const [x, y] = at((i + 0.5) / 12), sw = Math.sin(TAU * (u * 3) + i * 0.7) * 60 * pos.K, fw = 120 * pos.K;
          g.fillStyle = M.FLAG[i % 5];
          g.beginPath(); g.moveTo(x - fw, y); g.lineTo(x + fw, y); g.lineTo(x + fw + sw, y + 300 * pos.K); g.lineTo(x - fw + sw, y + 300 * pos.K); g.fill();
        }
      }
    },
  });
}

SCENES.dmountains = { group: '3D drive', label: 'Mountain Pass', gen(seed, loop) { genDriveMountains(seed, loop); }, draw: drawDriveMountains };
