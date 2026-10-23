'use strict';
// Primitive Drive (3D drive): a black road winding across a flat blue grid plane between
// giant flat-shaded primitives: cubes, pyramids, cones and faceted spheres, some spinning,
// with huge landmark shapes farther out and a gradient sky. Old-school 3D.

let dprim;

function genDrivePrims(seed, loop) {
  let r = rng(seed * 8513 + 7);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 34, curve: 2.6, hill: 0.03 });
  const pick = a => a[Math.floor(r() * a.length)];
  const shape = (x, size) => { const type = pick(PRIM_TYPES); return { type: 'prim', shape: type, x, w: size, h: type === 'sphere' ? size : size * (0.8 + r() * 0.9), color: pick(PRIM_COLORS), yaw: r() * TAU, spin: r() < 0.6 ? 0 : (r() < 0.5 ? -1 : 1), f: r() }; };
  for (let i = 0; i < T.n; i++) {
    const s = T.segs[i];
    for (const side of [-1, 1]) {
      { const it = place(r, 0.12, () => (shape(side * (1.6 + r() ** 1.5 * 6), 500 + r() * 1300))); if (it) s.items.push(it); }
      { const it = place(r, 0.02, () => (shape(side * (9 + r() * 10), 4000 + r() * 6000))); if (it) s.items.push(it); }
    }
  }

  // Everything below gets its own random sequence, so it stays put when Density changes
  // how many roadside objects were placed above.
  r = rng(seed * 8513 + 8);
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.5);
    gr.addColorStop(0, '#00000c'); gr.addColorStop(0.6, '#14206a'); gr.addColorStop(1, '#9ab0ff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.5 + 2);
    g.fillStyle = '#5a7aff'; g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * W, r() * H * 0.25, 2 * k + 0.5, 2 * k + 0.5); }
    g.globalAlpha = 1;
  });
  // Far silhouettes of giant shapes on the horizon, tiling one screen width.
  const far = paintLayer(g => {
    for (const dx of [-W, 0, W]) for (let i = 0; i < 9; i++) {
      const x = ((i + 0.5) / 9) * W + dx, hgt = (0.03 + ((i * 7) % 5) * 0.012) * H, w = hgt * 1.4, y = H * 0.5;
      g.fillStyle = ['#2a3a9a', '#3a4ab0', '#22307e'][i % 3];
      if (i % 3 === 0) { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - hgt); g.lineTo(x + w / 2, y); g.fill(); }
      else if (i % 3 === 1) { g.beginPath(); g.arc(x, y, hgt * 0.7, Math.PI, TAU); g.fill(); }
      else g.fillRect(x - w * 0.35, y - hgt * 0.8, w * 0.7, hgt * 0.8);
    }
  });

  dprim = { T, sky, far, k };
}

function drawDrivePrims(u) {
  const g = sctx, P = dprim, W = GW, H = GH, F = W / 2, k = P.k, hz = 0.5 * H;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, P.T, u, {
    horizon: 0.5, camH: 1000, camX: 0.3,
    sky(g, u, bg) { blit(g, P.sky); blitTile(g, P.far, bg * W * 0.004); },
    segment(g, a, b) {
      const alt = Math.floor(a.s.i / 4) % 2;
      dStrip(g, a, b, -60, 60, alt ? '#2244e0' : '#1e3ed6');
      // Grid: lines across every fourth segment and along the plane every two road widths.
      if (a.s.i % 4 === 0) dStrip(g, a, dLerp(a, b, 0.12), -60, 60, '#6a8cff');
      for (let x = 2; x <= 24; x += 2) { dStrip(g, a, b, x - 0.04, x + 0.04, '#6a8cff'); dStrip(g, a, b, -x - 0.04, -x + 0.04, '#6a8cff'); }
      dStrip(g, a, b, -1, 1, '#060608');
      dStrip(g, a, b, -1, -0.95, '#f0f0f0'); dStrip(g, a, b, 0.95, 1, '#f0f0f0');
      if (alt) dStrip(g, a, b, -0.025, 0.025, '#f0f0f0');
    },
    item(g, it, pos, vis, n, u) {
      // Camera-space base of the shape, recovered from its projected ground point.
      const z = (DRIVE.DEPTH * F) / pos.K, bx = (pos.X + it.x * pos.R - W / 2) / pos.K, by = -(pos.Y - hz) / pos.K;
      primShadow(g, bx, by, z, it.w, hz, F, 0.5 * pos.fade);
      drawPrim(g, it.shape, bx, by, z, it.w, it.h, it.yaw + TAU * u * it.spin, it.color, hz, F, pos.fade, k);
    },
  });
}

SCENES.dprims = { group: '3D drive', label: 'Primitive Drive', gen(seed, loop) { genDrivePrims(seed, loop); }, draw: drawDrivePrims };
