'use strict';
// Coast Highway (3D drive): a twisting beach highway at sunset. Ocean and beach on one side
// with surf washing up and down the sand, sunlit scrub and rocks on the other, Cruis'n-style
// palms lining both sides, a guardrail on the ocean side, the occasional lifeguard tower,
// traffic both ways, and the sun sinking into the sea ahead.

let dcoast;

function genDriveCoast(seed, loop) {
  let r = rng(seed * 5153 + 21);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 40, curve: 2.8, hill: 0.06 });
  const sea = r() < 0.5 ? -1 : 1;  // which side the ocean is on
  const pick = a => a[Math.floor(r() * a.length)];

  // Palms: a few shapes, each pre-rendered in four sway poses.
  const palms = Array.from({ length: 5 }, (_, i) => { const ps = palmSprite(r, 0, i === 4); return [0, 1, 2, 3].map(f => ps.make(f)); });
  const rocks = [rockSprite(r, ['#5a3a3a', '#8a5a4a']), rockSprite(r, ['#4a3036', '#7a4a44'])];
  const tower = dSprite(240, 260, 1500, (g, w, h) => {
    g.fillStyle = '#e8e0d0';
    for (const x of [0.25, 0.75]) g.fillRect(w * x - 5, h * 0.45, 10, h * 0.55);
    g.fillStyle = '#5ab8d8'; g.fillRect(w * 0.1, h * 0.22, w * 0.8, h * 0.26);
    g.fillStyle = '#f0e8d8'; g.beginPath(); g.moveTo(0, h * 0.24); g.lineTo(w / 2, 0); g.lineTo(w, h * 0.24); g.fill();
    g.fillStyle = '#2a1a2a'; g.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.12);
  });

  for (let i = 0; i < T.n; i++) {
    const s = T.segs[i];
    { const it = place(r, 1 / 6, () => ({ type: 'palm', x: -sea * (1.6 + r() * 1.6), v: Math.floor(r() * 5), ph: Math.floor(r() * 4), flip: r() < 0.5, f: r() * 0.5 })); if (it) s.items.push(it); }
    { const it = place(r, 1 / 9, () => ({ type: 'palm', x: sea * (1.45 + r() * 0.6), v: Math.floor(r() * 5), ph: Math.floor(r() * 4), flip: r() < 0.5, f: 0.5 + r() * 0.5 })); if (it) s.items.push(it); }
    { const it = place(r, 0.06, () => ({ type: 'rock', x: -sea * (3 + r() * 6), v: Math.floor(r() * 2), sc: 1 + r() * 3 })); if (it) s.items.push(it); }
    { const it = place(r, 0.012, () => ({ type: 'tower', x: sea * 2.6 })); if (it) s.items.push(it); }
    if (i % 2 === 0) s.items.push({ type: 'post', x: sea * 1.22 });
  }
  // Everything below gets its own random sequence, so it stays put when Density changes
  // how many roadside objects were placed above.
  r = rng(seed * 5153 + 22);
  const traffic = [
    ...upTo(4, () => ({ x: -sea * 0.72, laps: 0, z0: r(), color: pick(CAR_COLORS), front: false })),
    ...upTo(5, () => ({ x: sea * (0.3 + r() * 0.4), laps: -1, z0: r(), color: pick(CAR_COLORS), front: true })),
  ];

  const sunX = (0.4 + r() * 0.2) * W;
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.5);
    gr.addColorStop(0, '#160c38'); gr.addColorStop(0.45, '#5a2066'); gr.addColorStop(0.8, '#e0505a'); gr.addColorStop(1, '#ffb066');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.5 + 2);
    for (let i = 0; i < 7; i++) {
      const cy = (0.06 + r() * 0.32) * H, cx = r() * W, rx = (0.08 + r() * 0.16) * W;
      g.globalAlpha = 0.5; g.fillStyle = cy > 0.25 * H ? '#ff8a7a' : '#a04a8a';
      g.beginPath(); g.ellipse(cx, cy, rx, (0.005 + r() * 0.007) * H, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    const sg = g.createLinearGradient(0, H * 0.5 - 0.1 * H * 2, 0, H * 0.5);
    sg.addColorStop(0, '#fff2b0'); sg.addColorStop(1, '#ff7a40');
    g.fillStyle = gr;
    glow(g, sunX, H * 0.46, 0.35 * H, '#ffb070', 0.45);
    g.save(); g.beginPath(); g.rect(0, 0, W, H * 0.5); g.clip();
    g.fillStyle = sg; g.beginPath(); g.arc(sunX, H * 0.47, 0.1 * H, 0, TAU); g.fill();
    g.fillStyle = gr; for (let i = 0; i < 4; i++) g.fillRect(sunX - 0.1 * H, H * (0.47 + 0.015 + i * 0.02), 0.2 * H, H * (0.004 + i * 0.002));
    g.restore();
    // Below the horizon: sea on one side, hazy hills on the other, under the road.
    const sea2 = g.createLinearGradient(0, H * 0.5, 0, H);
    sea2.addColorStop(0, '#c86070'); sea2.addColorStop(1, '#1e2a5a');
    g.fillStyle = sea2; g.fillRect(0, H * 0.5, W, H * 0.5);
  });
  const hills = paintLayer(g => {
    g.fillStyle = '#5a3050';
    g.beginPath(); g.moveTo(0, H * 0.5);
    for (let x = 0; x <= 1.0001; x += 0.005) g.lineTo(x * W, H * (0.5 - 0.03 - 0.03 * Math.sin(TAU * (x * 2 + 0.2)) - 0.015 * Math.sin(TAU * x * 7)));
    g.lineTo(W, H * 0.5); g.fill();
  });

  dcoast = { T, sea, palms, rocks, tower, traffic, sky, hills, k, sunX };
}

function drawDriveCoast(u) {
  const g = sctx, C = dcoast, W = GW, H = GH, k = C.k, s = C.sea;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, C.T, u, {
    horizon: 0.5, camH: 1150, camX: -s * 0.3, traffic: C.traffic,
    sky(g, u, bg) {
      blit(g, C.sky);
      // Hills sit on the land half of the horizon and slide with the curves.
      g.save(); g.beginPath(); g.rect(s > 0 ? 0 : W / 2, 0, W / 2, H); g.clip();
      blitTile(g, C.hills, bg * W * 0.004); g.restore();
    },
    segment(g, a, b, u) {
      const alt = Math.floor(a.s.i / 4) % 2, far = a.n / DRIVE.DRAW;
      dStrip(g, a, b, -s * 60, 0, alt ? '#4a3a34' : '#44342e');
      // Surf washes up and down the beach.
      const shore = 2.4 + 0.25 * Math.sin(TAU * (u * Math.max(1, Math.round(cfg.loop / 2)) + a.s.i * 0.03));
      dStrip(g, a, b, s * 1.1, s * 60, mixCss(alt ? '#1e2e62' : '#22346a', '#c06878', far * far));
      dStrip(g, a, b, s * 1.1, s * shore, alt ? '#d8a080' : '#d09878');
      dStrip(g, a, b, s * shore, s * (shore + 0.12), '#fff4e8');
      dStrip(g, a, b, -1.1, 1.1, alt ? '#e8e0e0' : '#c83a3a');
      dStrip(g, a, b, -1, 1, alt ? '#2c2832' : '#28242e');
      dStrip(g, a, b, -0.035, -0.012, '#ffcc55'); dStrip(g, a, b, 0.012, 0.035, '#ffcc55');
      if (alt) { dStrip(g, a, b, -0.52, -0.5, '#e0e0e8'); dStrip(g, a, b, 0.5, 0.52, '#e0e0e8'); }
      dWall(g, a, b, s * 1.22, 180, 260, '#c0c0c8');
    },
    item(g, it, pos, vis, n, u) {
      const X = pos.X + it.x * pos.R;
      if (it.type === 'palm') dDraw(g, C.palms[it.v][(Math.floor(u * cfg.loop * 2) + it.ph) % 4], X, pos.Y, pos.K, pos.fade, it.flip);
      else if (it.type === 'rock') dDraw(g, C.rocks[it.v], X, pos.Y, pos.K, pos.fade, false, it.sc);
      else if (it.type === 'tower') dDraw(g, C.tower, X, pos.Y, pos.K, pos.fade);
      else if (it.type === 'post') { g.globalAlpha = pos.fade; g.fillStyle = '#8a8a94'; g.fillRect(X - 25 * pos.K, pos.Y - 280 * pos.K, 50 * pos.K, 280 * pos.K); }
    },
    car(g, c, pos) { dCar(g, pos, c.x, c.color, c.front, pos.fade); },
  });
}

SCENES.dcoast = { group: '3D drive', label: 'Coast Highway', gen(seed, loop) { genDriveCoast(seed, loop); }, draw: drawDriveCoast };
