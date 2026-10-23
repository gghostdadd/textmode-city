'use strict';
// Primitives (side view): an old-school 3D render. A flat blue plane runs to the horizon
// under a gradient sky, with rows of flat-shaded cubes, pyramids, cones and faceted spheres
// at increasing distance, some slowly spinning, each with a drop shadow.
// Each row repeats every screen width at its own depth. Parallax slides the rows 1 to 4
// screen widths per loop (far to near), so nearer rows pass faster.

let prim;

function genPrimitives(seed, loop) {
  const r = rng(seed * 6271 + 41), W = GW, H = GH, F = W / 2, k = W / 1920;
  const pick = a => a[Math.floor(r() * a.length)];
  const camH = 900, hz = 0.46 * H;
  const rowsZ = [12000, 6800, 3900, 2300];
  const rowsP = rowsZ.map((z, i) => {
    const period = W / ((DRIVE.DEPTH * F) / z), n = Math.max(1, Math.round((2 + Math.floor(r() * 3)) * cfg.density)), size = [3000, 1500, 800, 460][i];
    return {
      z, period, laps: i + 1,
      shapes: Array.from({ length: n }, (_, j) => {
        const type = pick(PRIM_TYPES), s = size * (0.7 + r() * 0.6);
        return { type, x: ((j + 0.2 + r() * 0.6) / n) * period, w: s, h: type === 'sphere' ? s : s * (0.8 + r() * 0.9), color: pick(PRIM_COLORS), yaw: r() * TAU, spin: r() < 0.5 ? 0 : (r() < 0.5 ? -1 : 1), dz: (r() - 0.5) * z * 0.15 };
      }),
    };
  });
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, '#00000c'); gr.addColorStop(0.6, '#14206a'); gr.addColorStop(1, '#9ab0ff');
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 1);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * W, r() * hz * 0.5, 2 * k + 0.5, 2 * k + 0.5); }
    g.globalAlpha = 1;
    // The plane: deeper blue toward the viewer, with grid lines at even depth steps.
    const pl = g.createLinearGradient(0, hz, 0, H);
    pl.addColorStop(0, '#5a7aff'); pl.addColorStop(0.15, '#2a4cf0'); pl.addColorStop(1, '#0c22b0');
    g.fillStyle = pl; g.fillRect(0, hz, W, H - hz);
    g.strokeStyle = '#7a9aff'; g.lineWidth = 2 * k; g.globalAlpha = 0.5;
    for (let z = 700; z < 60000; z *= 1.32) { const y = hz + ((DRIVE.DEPTH * F) / z) * camH; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.globalAlpha = 1;
  });
  prim = { rowsP, sky, camH, hz, k };
}

function drawPrimitives(u) {
  const g = sctx, P = prim, W = GW, F = W / 2, k = P.k;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, P.sky);
  for (const row of P.rowsP) {
    const off = cfg.pan ? u * row.period * row.laps : 0;
    const list = [];
    for (const s of row.shapes) {
      const x = ((((s.x - off) % row.period) + row.period) % row.period) - row.period / 2;
      for (const dx of [-row.period, 0, row.period]) list.push({ s, x: x + dx, z: row.z + s.dz });
    }
    list.sort((a, b) => b.z - a.z);
    for (const it of list) primShadow(g, it.x, -P.camH, it.z, it.s.w, P.hz, F, 0.55);
    for (const it of list) {
      const s = it.s;
      drawPrim(g, s.type, it.x, -P.camH, it.z, s.w, s.h, s.yaw + TAU * u * s.spin, s.color, P.hz, F, 1, k);
    }
  }
}

SCENES.prims = { label: 'Primitives', gen(seed, loop) { genPrimitives(seed, loop); }, draw: drawPrimitives };
