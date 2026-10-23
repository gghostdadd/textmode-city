'use strict';
// Jungle Trail (3D walk): walking a dirt trail through dense jungle at dusk. Ferns and
// big-leaf plants crowd the edges, mossy trunks with vines rise past, palms lean in, vines
// hang over the path ahead, light shafts slant down through the canopy and fireflies drift.
// Walking pace, a gentle head bob, and a slow winding trail.

let djun;

function genDriveJungle(seed, loop) {
  let r = rng(seed * 4241 + 31);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 12, curve: 2.2, hill: 0.05 });
  const pick = a => a[Math.floor(r() * a.length)];
  const GREENS = ['#1f5a2c', '#2c7434', '#3c8a3c', '#4f9a44', '#24662e'];

  const fern = () => { const fr = Array.from({ length: 9 }, (_, i) => ({ a: -Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5), L: 0.7 + r() * 0.3, c: pick(GREENS) })); return [0, 1, 2, 3].map(f => dSprite(420, 240, 1100, (g, w, h) => {
    for (const q of fr) {
      const a = q.a + Math.sin(TAU * (f / 4) + q.a * 3) * 0.06, L = q.L * h * 0.95;
      g.strokeStyle = q.c; g.lineWidth = 3;
      let px = w / 2, py = h;
      for (let j = 1; j <= 10; j++) {
        const t = j / 10, nx = w / 2 + Math.cos(a) * L * t * 1.1, ny = h + Math.sin(a) * L * t + L * 0.5 * t * t;
        g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        const lx = (ny - py) * 1.6, ly = -(nx - px) * 1.6;
        g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + lx, ny + ly + 4); g.moveTo(nx, ny); g.lineTo(nx - lx, ny - ly + 4); g.stroke();
        px = nx; py = ny;
      }
    }
  })); };
  const ferns = [fern(), fern()];
  const leafPlant = () => dSprite(500, 460, 1500, (g, w, h) => {
    for (let i = 0; i < 7; i++) drawLeaf(g, w / 2 + (r() - 0.5) * 30, h, -Math.PI / 2 + (r() - 0.5) * 2.2, h * (0.55 + r() * 0.4), 0.35 + r() * 0.15, pick(GREENS));
  });
  const leaves = [leafPlant(), leafPlant()];
  const tree = () => dSprite(380, 1600, 2600, (g, w, h) => {
    const tw = w * 0.22;
    const bark = g.createLinearGradient(w / 2 - tw, 0, w / 2 + tw, 0);
    bark.addColorStop(0, '#2a2218'); bark.addColorStop(0.6, '#4a3e2c'); bark.addColorStop(1, '#1e180f');
    g.fillStyle = bark; g.beginPath();
    g.moveTo(w / 2 - tw * 0.8, 0); g.lineTo(w / 2 + tw * 0.8, 0); g.lineTo(w / 2 + tw, h - 120); g.lineTo(w / 2 + tw * 2.2, h); g.lineTo(w / 2 - tw * 2.2, h); g.lineTo(w / 2 - tw, h - 120); g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = pick(['#2f6a34', '#4f9a44', '#24552a']); g.beginPath(); g.ellipse(w / 2 + (r() - 0.5) * tw * 1.6, r() * h, 6 + r() * 10, 4 + r() * 6, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#2c5a28'; g.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const x0 = w / 2 + (r() - 0.5) * tw * 1.4; g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + 30, h * 0.3, x0 - 30, h * 0.5, x0 + (r() - 0.5) * 40, h * (0.6 + r() * 0.3)); g.stroke(); }
  });
  const trees = [tree(), tree()];
  const palms = [0, 1].map(() => { const ps = palmSprite(r, 0, false); return [0, 1, 2, 3].map(f => ps.make(f)); });
  const vine = dSprite(80, 900, 260, (g, w, h) => {
    g.strokeStyle = '#244a26'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2, 0);
    for (let y = 0; y <= h; y += 30) g.lineTo(w / 2 + Math.sin(y * 0.02) * 10, y);
    g.stroke();
    for (let y = 40; y < h; y += 45) { g.fillStyle = pick(GREENS); g.beginPath(); g.ellipse(w / 2 + (y % 90 ? 14 : -14), y, 16, 8, y % 90 ? 0.5 : -0.5, 0, TAU); g.fill(); }
  });

  for (let i = 0; i < T.n; i++) {
    const s = T.segs[i];
    for (const side of [-1, 1]) {
      { const it = place(r, 0.9, () => ({ type: 'fern', x: side * (0.55 + r() * 1.6), v: Math.floor(r() * 2), ph: Math.floor(r() * 4), sc: 0.6 + r() * 0.9, flip: r() < 0.5, f: r() })); if (it) s.items.push(it); }
      { const it = place(r, 0.35, () => ({ type: 'leaf', x: side * (0.7 + r() * 2.5), v: Math.floor(r() * 2), sc: 0.6 + r() * 0.8, flip: r() < 0.5, f: r() })); if (it) s.items.push(it); }
      { const it = place(r, 0.28, () => ({ type: 'tree', x: side * (1.3 + r() * 4), v: Math.floor(r() * 2), sc: 0.8 + r() * 0.6, f: r() })); if (it) s.items.push(it); }
      { const it = place(r, 0.06, () => ({ type: 'palm', x: side * (1.2 + r() * 2), v: Math.floor(r() * 2), ph: Math.floor(r() * 4), flip: side > 0 })); if (it) s.items.push(it); }
    }
    { const it = place(r, 0.12, () => ({ type: 'vine', x: (r() - 0.5) * 1.6, sc: 0.8 + r() * 0.6, top: 3200 + r() * 1400 })); if (it) s.items.push(it); }
  }

  // Everything below gets its own random sequence, so it stays put when Density changes
  // how many roadside objects were placed above.
  r = rng(seed * 4241 + 32);
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.55);
    gr.addColorStop(0, '#030a08'); gr.addColorStop(0.7, '#0c2a22'); gr.addColorStop(1, '#3a5a44');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    glow(g, W * 0.5, H * 0.5, 0.35 * W, '#c8d890', 0.2);
  });
  const wall = paintLayer(g => {
    for (let i = 0; i < 500; i++) {
      const x = r() * W, y = H * (0.55 - r() ** 1.5 * 0.5);
      g.fillStyle = pick(['#0f2a1c', '#153a24', '#1c4a2c', '#0a2014']);
      g.beginPath(); g.ellipse(x, y, (14 + r() * 30) * k, (10 + r() * 22) * k, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#0a2014'; g.fillRect(0, H * 0.5, W, H * 0.5);
  });

  djun = {
    T, ferns, leaves, trees, palms, vine, sky, wall, k,
    flies: upTo(40, () => ({ x: r() * W, y: (0.25 + r() * 0.6) * H, ax: (20 + r() * 60) * k, ay: (10 + r() * 30) * k, fx: 1 + Math.floor(r() * 2), fy: 1 + Math.floor(r() * 3), p: r(), q: r(), m: 2 + Math.floor(r() * 3), o: r() })),
    shafts: Array.from({ length: 4 }, () => ({ x: (0.1 + r() * 0.8) * W, w: (30 + r() * 60) * k, lean: (r() - 0.5) * 0.4 * H, ph: r() })),
  };
}

function drawDriveJungle(u) {
  const g = sctx, J = djun, W = GW, H = GH, k = J.k, steps = Math.max(2, cfg.loop * 2);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, J.T, u, {
    horizon: 0.52, camH: 560, camX: 0, bob: u => Math.abs(Math.sin(Math.PI * u * steps)) * 40,
    sky(g, u, bg) { blit(g, J.sky); blitTile(g, J.wall, bg * W * 0.006); },
    segment(g, a, b) {
      const alt = Math.floor(a.s.i / 4) % 2;
      dStrip(g, a, b, -60, 60, alt ? '#14301c' : '#122c1a');
      dStrip(g, a, b, -0.5, 0.5, alt ? '#2a3a20' : '#26361e');
      dStrip(g, a, b, -0.38, 0.38, alt ? '#4a3a28' : '#463626');
    },
    item(g, it, pos, vis, n, u) {
      const X = pos.X + it.x * pos.R, frame = (Math.floor(u * cfg.loop * 2) + (it.ph || 0)) % 4;
      if (it.type === 'fern') dDraw(g, J.ferns[it.v][frame], X, pos.Y, pos.K, pos.fade, it.flip, it.sc);
      else if (it.type === 'leaf') dDraw(g, J.leaves[it.v], X, pos.Y, pos.K, pos.fade, it.flip, it.sc);
      else if (it.type === 'tree') dDraw(g, J.trees[it.v], X, pos.Y, pos.K, pos.fade, false, it.sc);
      else if (it.type === 'palm') dDraw(g, J.palms[it.v][frame], X, pos.Y, pos.K, pos.fade, it.flip);
      else if (it.type === 'vine') dDraw(g, J.vine, X, pos.Y - it.top * pos.K + J.vine.wW * pos.K * it.sc * (J.vine.img.height / J.vine.img.width), pos.K, pos.fade, false, it.sc);
    },
    overlay(g, u) {
      g.globalCompositeOperation = 'lighter';
      for (const s of J.shafts) {
        const gr = g.createLinearGradient(0, 0, 0, H * 0.9);
        gr.addColorStop(0, 'rgba(220,240,170,.1)'); gr.addColorStop(1, 'rgba(220,240,170,0)');
        g.globalAlpha = 0.75 + 0.25 * Math.sin(TAU * (u * 2) + s.ph * TAU); g.fillStyle = gr;
        g.beginPath(); g.moveTo(s.x - s.w / 2, 0); g.lineTo(s.x + s.w / 2, 0); g.lineTo(s.x + s.w * 1.6 + s.lean, H * 0.9); g.lineTo(s.x - s.w * 1.6 + s.lean, H * 0.9); g.fill();
      }
      for (const f of J.flies) {
        const b = Math.max(0, Math.sin(TAU * (f.m * u + f.o))) ** 2;
        if (b < 0.05) continue;
        const x = f.x + f.ax * Math.sin(TAU * (f.fx * u + f.p)), y = f.y + f.ay * Math.sin(TAU * (f.fy * u + f.q));
        glow(g, x, y, 16 * k, '#e8ff70', b * 0.9);
        g.globalAlpha = b; g.fillStyle = '#fbffc0'; g.fillRect(x - 2 * k, y - 2 * k, 4 * k, 4 * k);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
  });
}

SCENES.djungle = { group: '3D drive', label: 'Jungle Trail', gen(seed, loop) { genDriveJungle(seed, loop); }, draw: drawDriveJungle };
