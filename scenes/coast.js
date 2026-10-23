'use strict';
// Pacific Coast: a sunset drive along the coast highway. A big sun sinks into the ocean with
// a glittering sun path; swells roll in and break on the beach; a pier with lamps reaches
// out to sea; headlands with cliff-top houses frame the bay; palms and streetlamps line the
// highway, and traffic runs both ways.
// Parallax turns it into a drive: headlands, pier and beach slide 1 screen width per loop,
// palms, lamps and guardrail 2, road markings 3. Sky and sea stay put.

let coast;

const CAR_COLORS = ['#e8e0d0', '#ff5a7a', '#40c8e0', '#ffd060', '#2a2a3a', '#c83a3a', '#7a8aff'];

function genCoast(seed, loop) {
  const r = rng(seed * 8311 + 17), W = GW, H = GH, k = W / 1920;
  const side = r() < 0.5 ? 1 : -1;
  const X = x => (side > 0 ? x : 1 - x) * W, Y = y => y * H;
  const HZ = 0.5, SHORE = 0.715;
  const sun = { x: X(0.36 + r() * 0.12), y: Y(0.43), r: 0.1 * H };

  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, Y(HZ));
    gr.addColorStop(0, '#160c38'); gr.addColorStop(0.4, '#5a2066'); gr.addColorStop(0.75, '#e0505a'); gr.addColorStop(1, '#ffb066');
    g.fillStyle = gr; g.fillRect(0, 0, W, Y(HZ) + 1);
    glow(g, sun.x, sun.y, sun.r * 4, '#ffb070', 0.45);
    // Sun with a few horizontal cuts across its lower half, clipped at the horizon.
    g.save(); g.beginPath(); g.rect(0, 0, W, Y(HZ)); g.clip();
    const sg = g.createLinearGradient(0, sun.y - sun.r, 0, sun.y + sun.r);
    sg.addColorStop(0, '#fff2b0'); sg.addColorStop(1, '#ff7a40');
    g.fillStyle = sg; g.beginPath(); g.arc(sun.x, sun.y, sun.r, 0, TAU); g.fill();
    g.fillStyle = gr;
    for (let i = 0; i < 4; i++) g.fillRect(sun.x - sun.r, sun.y + sun.r * (0.15 + i * 0.2), sun.r * 2, sun.r * (0.04 + i * 0.025));
    g.restore();
    // Long thin clouds lit from below.
    for (let i = 0; i < 6; i++) {
      const cy = Y(0.08 + r() * 0.3), cx = r() * W, rx = (0.1 + r() * 0.18) * W;
      g.globalAlpha = 0.5; g.fillStyle = cy > Y(0.25) ? '#ff8a7a' : '#a04a8a';
      g.beginPath(); g.ellipse(cx, cy, rx, (0.006 + r() * 0.008) * H, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.35; g.fillStyle = '#ffd0a0';
      g.beginPath(); g.ellipse(cx + rx * 0.1, cy + 0.004 * H, rx * 0.6, 0.003 * H, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // Ocean: warm near the horizon, deep blue toward the shore.
    const sea = g.createLinearGradient(0, Y(HZ), 0, Y(SHORE));
    sea.addColorStop(0, '#d0606a'); sea.addColorStop(0.25, '#6a3a7a'); sea.addColorStop(1, '#1e2a5a');
    g.fillStyle = sea; g.fillRect(0, Y(HZ), W, Y(SHORE) - Y(HZ) + 2);
    g.strokeStyle = '#2a2050'; g.lineWidth = 1.5 * k; g.globalAlpha = 0.5;
    for (let y = HZ + 0.01; y < SHORE; y += 0.008 + (y - HZ) * 0.06) {
      g.beginPath(); for (let x = 0; x <= W; x += 20 * k) g.lineTo(x, Y(y) + Math.sin(x * 0.01 + y * 90) * 2 * k); g.stroke();
    }
    g.globalAlpha = 1;
    const sand = g.createLinearGradient(0, Y(SHORE), 0, Y(0.82));
    sand.addColorStop(0, '#b0706a'); sand.addColorStop(1, '#6a4050');
    g.fillStyle = sand; g.fillRect(0, Y(SHORE), W, Y(0.826) - Y(SHORE));
    g.fillStyle = '#18141e'; g.fillRect(0, Y(0.825), W, Y(0.93) - Y(0.825));
    g.fillStyle = '#0c0a10'; g.fillRect(0, Y(0.93), W, H - Y(0.93));
  });

  // Headlands framing the bay, tiling one screen width so they can scroll.
  const heads = [
    { s: 0.52, e: 0.84, top: 0.462, sea: HZ + 0.004, c: '#8a5280' },
    { s: 0.66, e: 1.0, top: 0.425, sea: HZ + 0.03, c: '#563064' },
    { s: 0.8, e: 1.07, top: 0.37, sea: SHORE, c: '#24163a' },
  ].map(h => ({ ...h, bumps: Array.from({ length: 4 }, (_, i) => ({ f: 3 + i * 4, a: 0.012 / (i + 1), p: r() })) }));
  const headY = (h, xn) => {
    const t = (xn - h.s) / (h.e - h.s);
    if (t <= 0 || t >= 1) return null;
    const rise = Math.min(1, t / 0.35) ** 0.8, fall = Math.min(1, (1 - t) / 0.3) ** 1.2;
    return h.sea - (h.sea - h.top) * Math.min(rise, fall) + h.bumps.reduce((s, b) => s + b.a * Math.sin(TAU * (b.f * xn + b.p)), 0) * Math.min(rise, fall);
  };
  const houses = [];
  const land = paintLayer(g => {
    for (const h of heads) for (const dx of [-1, 0]) {
      g.fillStyle = h.c; g.beginPath(); let started = false;
      for (let xn = h.s; xn <= h.e; xn += 0.003) {
        const y = headY(h, xn); if (y === null) continue;
        const px = X(xn + dx);
        if (!started) { g.moveTo(px, Y(h.sea)); started = true; }
        g.lineTo(px, Y(y));
      }
      g.lineTo(X(h.e + dx), Y(h.sea)); g.lineTo(X(h.s + dx), Y(h.sea)); g.fill();
    }
    // Cliff face streaks on the near headland.
    const near = heads[2];
    g.strokeStyle = '#120a20'; g.lineWidth = 3 * k; g.globalAlpha = 0.6;
    for (let i = 0; i < 40; i++) {
      const xn = near.s + 0.02 + r() * 0.1, y = headY(near, xn);
      if (y === null) continue;
      for (const dx of [-1, 0]) { g.beginPath(); g.moveTo(X(xn + dx), Y(y + 0.02)); g.lineTo(X(xn + dx) + (r() - 0.5) * 10 * k, Y(SHORE)); g.stroke(); }
    }
    g.globalAlpha = 1;
    for (let i = 0, n = Math.round(14 * cfg.density); i < n; i++) {
      const xn = near.s + 0.06 + r() * 0.16, y = headY(near, xn);
      if (y !== null) houses.push({ xn: xn % 1, y: y + 0.004 + r() * 0.02, w: (8 + r() * 12) * k, id: i });
    }
  });

  const posts = Array.from({ length: Math.round(W / (60 * k)) }, (_, i) => i / Math.round(W / (60 * k)));
  // Palms in clusters: tall slender fan-crowned palms mixed with short, thick date palms.
  const palms = [];
  for (let c = 0, nc = Math.max(1, Math.round(4 * cfg.density)); c < nc; c++) {
    const cx = (c + 0.15 + r() * 0.7) / nc, n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const date = r() < 0.3;
      palms.push({
        xn: cx + (j - (n - 1) / 2) * 0.028 + (r() - 0.5) * 0.01, date,
        h: (date ? 0.2 + r() * 0.08 : 0.36 + r() * 0.14) * H, lean: (r() - 0.5) * (date ? 0.08 : 0.3),
        tw: date ? 26 : 12, L: (date ? 0.13 : 0.12) * H * (0.9 + r() * 0.2), fronds: date ? 20 : 15,
        rot: r() * TAU, ph: r(), k: r() < 0.5 ? 1 : 2, seed: r(),
      });
    }
  }
  palms.sort((a, b) => b.h - a.h);
  const lamps = Array.from({ length: 3 }, (_, i) => ({ xn: (i + 0.5) / 3 + 0.08 }));
  const lanes = [
    { y: Y(0.865), dir: -side, s: 1.1, k: 1, cars: upTo(2, () => ({ o: r(), c: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], type: Math.floor(r() * 4) })) },
    { y: Y(0.915), dir: side, s: 1.4, k: 2, cars: upTo(2, () => ({ o: r(), c: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], type: Math.floor(r() * 4) })) },
  ];

  return {
    sky, land, houses, posts, palms, lamps, lanes, sun, side, X, Y, HZ, SHORE, k,
    pier: { s: 0.17, e: 0.42, y: 0.655 },
    tower: { xn: 0.62 },
    waves: Array.from({ length: 3 }, (_, i) => ({ o: i / 3, k: Math.max(1, Math.round(loop / 3)), ph: r() })),
    glitter: Array.from({ length: 160 }, () => ({ t: r() ** 0.7, o: r() * 2 - 1, w: (6 + r() * 20) * k })),
  };
}

function drawCarSide(g, x, y, s, dir, color, type, k) {
  const L = (type === 2 ? 120 : type === 3 ? 110 : 104) * s * k, Hb = (type === 2 ? 30 : type === 3 ? 14 : 18) * s * k;
  const x0 = x - L / 2;
  g.fillStyle = color;
  g.beginPath(); g.roundRect(x0, y - Hb - 8 * s * k, L, Hb, 5 * s * k); g.fill();
  if (type === 0 || type === 3) {
    g.beginPath();
    const c0 = x - (type === 3 ? 12 : 28) * dir * s * k, c1 = x + (type === 3 ? 18 : 22) * dir * s * k, top = y - Hb - 8 * s * k;
    g.moveTo(c0 - 6 * dir * s * k, top); g.lineTo(c0 + 4 * dir * s * k, top - 14 * s * k); g.lineTo(c1 - 8 * dir * s * k, top - 14 * s * k); g.lineTo(c1 + 6 * dir * s * k, top); g.fill();
    g.fillStyle = '#1a1626'; g.beginPath(); g.moveTo(c0, top); g.lineTo(c0 + 7 * dir * s * k, top - 11 * s * k); g.lineTo(c1 - 10 * dir * s * k, top - 11 * s * k); g.lineTo(c1, top); g.fill();
  } else if (type === 1) {
    g.fillStyle = '#1a1626'; g.fillRect(x + 10 * dir * s * k - 1.5 * k, y - Hb - 22 * s * k, 3 * k, 14 * s * k);
  } else {
    g.fillStyle = '#1a1626'; g.fillRect(x0 + 10 * s * k, y - Hb - 2 * s * k, L - 20 * s * k, 10 * s * k);
  }
  g.fillStyle = '#ffb090'; g.globalAlpha = 0.6; g.fillRect(x0 + 6 * s * k, y - Hb - 6 * s * k, L - 12 * s * k, 2 * k); g.globalAlpha = 1;
  g.fillStyle = '#08060c';
  for (const wx of [-0.32, 0.32]) { g.beginPath(); g.arc(x + wx * L, y - 8 * s * k, 9 * s * k, 0, TAU); g.fill(); }
  g.globalCompositeOperation = 'lighter';
  const fx = x + dir * L / 2, ly = y - Hb * 0.5 - 8 * s * k;
  const beam = g.createLinearGradient(fx, 0, fx + dir * 220 * s * k, 0);
  beam.addColorStop(0, 'rgba(255,240,200,.3)'); beam.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = beam; g.beginPath(); g.moveTo(fx, ly - 3 * k); g.lineTo(fx + dir * 220 * s * k, ly - 18 * s * k); g.lineTo(fx + dir * 220 * s * k, ly + 22 * s * k); g.lineTo(fx, ly + 4 * k); g.fill();
  glow(g, fx, ly, 26 * s * k, '#fff4d0', 1);
  glow(g, x - dir * L / 2, ly, 16 * s * k, '#ff2a40', 1);
  g.globalCompositeOperation = 'source-over';
}

// Arcade-sprite palm: tapered tan trunk with ring bands and a lit edge, and a full crown of
// broad serrated fronds radiating all the way round, drawn back to front.
function drawPalm(g, x, base, p, u, k, litRight) {
  const tx = x + p.lean * p.h, ty = base - p.h, cx = x + p.lean * p.h * 0.1, cy = base - p.h * 0.55;
  const at = t => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) ** 2 * base + 2 * (1 - t) * t * cy + t * t * ty];
  const N = 24, w0 = p.tw * k, w1 = p.tw * k * (p.date ? 0.85 : 0.55), L = [], R = [], M = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, [px, py] = at(t), [qx, qy] = at(Math.min(1, t + 0.02)), [ox, oy] = at(Math.max(0, t - 0.02));
    const len = Math.hypot(qx - ox, qy - oy) || 1, nx = -(qy - oy) / len, ny = (qx - ox) / len, w = (w0 + (w1 - w0) * t) / 2;
    L.push([px - nx * w, py - ny * w]); R.push([px + nx * w, py + ny * w]); M.push([px, py]);
  }
  const poly = pts => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill(); };
  g.fillStyle = '#8a7460'; poly([...L, ...R.slice().reverse()]);
  g.fillStyle = '#c0a07e'; poly([...(litRight ? R : L), ...M.slice().reverse()]);
  g.strokeStyle = '#4e3e32'; g.lineWidth = Math.max(1.5, 2 * k);
  const rings = Math.round(p.h / ((p.date ? 7 : 10) * k));
  for (let i = 1; i < rings; i++) {
    const t = i / rings, j = Math.floor(t * N), f = t * N - j;
    if (j >= N) break;
    const lx = L[j][0] + (L[j + 1][0] - L[j][0]) * f, ly = L[j][1] + (L[j + 1][1] - L[j][1]) * f;
    const rx = R[j][0] + (R[j + 1][0] - R[j][0]) * f, ry = R[j][1] + (R[j + 1][1] - R[j][1]) * f;
    g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo((lx + rx) / 2, (ly + ry) / 2 + 3 * k, rx, ry); g.stroke();
  }

  // Crown: each frond points round a circle; depth (z) sets draw order, droop and shade.
  const fronds = Array.from({ length: p.fronds }, (_, i) => {
    const a = (TAU * i) / p.fronds + p.rot + Math.sin(TAU * (u * p.k) + p.ph * TAU + i * 0.5) * 0.04;
    return { a, z: Math.sin(a), i };
  }).sort((f1, f2) => f1.z - f2.z);
  for (const f of fronds) {
    const len = p.L * (0.8 + 0.25 * Math.sin(f.i * 2.7 + p.seed * 9)), dx = Math.cos(f.a), up = f.z < -0.3 ? 0.55 : 0.3;
    const pt = t => [tx + dx * len * t * 1.15, ty - len * up * t + len * (0.75 + 0.35 * Math.max(0, f.z)) * t * t];
    const edgeA = [], edgeB = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12, [px, py] = pt(t), [qx, qy] = pt(Math.min(1, t + 0.04)), [ox, oy] = pt(Math.max(0, t - 0.04));
      const l = Math.hypot(qx - ox, qy - oy) || 1, nx = -(qy - oy) / l, ny = (qx - ox) / l;
      const w = len * 0.15 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.7 * (j % 2 ? 1.35 : 0.75);
      edgeA.push([px + nx * w, py + ny * w]); edgeB.push([px - nx * w, py - ny * w]);
    }
    const shade = clamp(0.55 + f.z * 0.45);
    g.fillStyle = mixCss('#1e5a26', '#6cc840', shade); poly([...edgeA, ...edgeB.reverse()]);
    g.strokeStyle = mixCss('#2a6a2c', '#c8f070', shade); g.lineWidth = Math.max(1, 1.5 * k);
    g.beginPath(); edgeA.forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
    g.strokeStyle = '#1a4a1e'; g.beginPath();
    for (let j = 0; j <= 12; j++) { const [a, b] = pt(j / 12); j ? g.lineTo(a, b) : g.moveTo(a, b); }
    g.stroke();
  }
  g.fillStyle = '#5a3a1a';
  for (let i = 0; i < (p.date ? 6 : 3); i++) { g.beginPath(); g.arc(tx + (i - 1) * 6 * k, ty + (6 + (i % 2) * 4) * k, 5 * k, 0, TAU); g.fill(); }
}

function drawCoast(u) {
  const g = sctx, C = coast, W = GW, H = GH, k = C.k, Y = C.Y;
  const lap = n => (cfg.pan ? u * W * n : 0);
  const sx = (xn, n) => { const x = C.X(xn) - lap(n); return ((x % W) + W) % W; };
  const step = Math.floor(u * cfg.loop * 6);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, C.sky);

  // Sun path: flickering dashes widening toward the shore.
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffe0a0';
  C.glitter.forEach((d, i) => {
    if (hash(i, step) < 0.45) return;
    const y = Y(C.HZ) + d.t * (Y(C.SHORE) - Y(C.HZ)), half = C.sun.r * (0.5 + d.t * 2.2);
    g.globalAlpha = 0.6 * (1 - d.t * 0.5); g.fillRect(C.sun.x + d.o * half, y, d.w, 2 * k + d.t * 2 * k);
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  blitTile(g, C.land, lap(1));
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffd890';
  for (const h of C.houses) {
    if (hash(h.id, Math.floor(step / 3)) < 0.1) continue;
    const x = sx(h.xn, 1);
    for (const xx of [x, x - W]) { glow(g, xx, Y(h.y), 10 * k, '#ffc070', 0.7); g.fillRect(xx - h.w / 2, Y(h.y) - 2 * k, h.w, 4 * k); }
  }
  g.globalCompositeOperation = 'source-over';

  // Waves: three crests roll in each cycle, break on the sand and wash back out.
  for (const w of C.waves) {
    const p = (w.o + u * w.k) % 1, y = Y(0.63 + (C.SHORE + 0.02 - 0.63) * Math.min(1, p * 1.25) ** 1.5);
    const a = (p < 0.8 ? 0.35 + p * 0.6 : (1 - p) * 4) * Math.min(1, p * 8);
    g.strokeStyle = '#fff4e8'; g.globalAlpha = clamp(a); g.lineWidth = (2 + p * 4) * k;
    g.beginPath();
    for (let x = 0; x <= W; x += 10 * k) {
      const on = Math.sin(x * 0.006 + w.ph * 20) > -0.4 || p > 0.75;
      const yy = y + Math.sin(x * 0.02 + w.ph * 9) * 3 * k;
      on ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke();
  }
  g.globalAlpha = 1;

  // Pier: deck, pilings and lamps, reflected as shimmering streaks.
  const P = C.pier, py = Y(P.y);
  for (const dx of [0, -W]) {
    const a = sx(P.s, 1) + dx, b = a + Math.abs(C.X(P.e) - C.X(P.s)), x0 = Math.min(a, b), x1 = Math.max(a, b);
    g.fillStyle = '#1a1020';
    for (let x = x0; x <= x1; x += 18 * k) g.fillRect(x, py, 3 * k, Y(C.SHORE) - py);
    g.fillRect(x0, py - 6 * k, x1 - x0, 6 * k);
    g.fillRect(x0, py - 16 * k, x1 - x0, 2 * k);
    const hut = C.side > 0 ? x0 : x1 - 40 * k;
    g.fillRect(hut, py - 34 * k, 40 * k, 28 * k);
    g.globalCompositeOperation = 'lighter';
    for (let x = x0 + 30 * k; x < x1; x += 70 * k) {
      g.fillStyle = '#1a1020'; g.fillRect(x, py - 30 * k, 2 * k, 24 * k);
      glow(g, x, py - 32 * k, 16 * k, '#ffd890', 0.9);
      g.fillStyle = '#ffc070'; g.globalAlpha = hash(Math.round(x), step) < 0.5 ? 0.35 : 0.2; g.fillRect(x - 2 * k, py + 6 * k, 4 * k, Y(C.SHORE) - py - 10 * k); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }

  // Lifeguard tower on the beach.
  for (const dx of [0, -W]) {
    const tx = sx(C.tower.xn, 1) + dx, ty = Y(C.SHORE + 0.06);
    g.fillStyle = '#2a1828';
    for (const lx of [-16, 16]) g.fillRect(tx + lx * k - 2 * k, ty - 30 * k, 4 * k, 30 * k);
    g.fillRect(tx - 24 * k, ty - 52 * k, 48 * k, 24 * k);
    g.beginPath(); g.moveTo(tx - 30 * k, ty - 52 * k); g.lineTo(tx, ty - 64 * k); g.lineTo(tx + 30 * k, ty - 52 * k); g.fill();
    g.fillStyle = '#5ab8d8'; g.fillRect(tx - 18 * k, ty - 46 * k, 36 * k, 10 * k);
    g.strokeStyle = '#2a1828'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(tx + 24 * k, ty - 30 * k); g.lineTo(tx + 60 * k, ty); g.stroke();
  }

  // Palms, streetlamps and guardrail between the beach and the road.
  const rail = Y(0.818);
  for (const p of C.palms) for (const dx of [0, -W]) drawPalm(g, sx(p.xn, 2) + dx, rail + (p.date ? 12 : 4) * k, p, u, k, C.sun.x > sx(p.xn, 2) + dx);
  for (const l of C.lamps) for (const dx of [0, -W]) {
    const x = sx(l.xn, 2) + dx, top = Y(0.56);
    g.fillStyle = '#100a14'; g.fillRect(x - 3 * k, top, 6 * k, rail - top);
    g.fillRect(x, top, 46 * k * C.side, 4 * k);
    g.globalCompositeOperation = 'lighter';
    glow(g, x + 46 * k * C.side, top + 6 * k, 40 * k, '#ffb060', 0.9);
    const cone = g.createLinearGradient(0, top, 0, Y(0.93));
    cone.addColorStop(0, 'rgba(255,176,96,.18)'); cone.addColorStop(1, 'rgba(255,176,96,.04)');
    g.fillStyle = cone; const lx = x + 46 * k * C.side;
    g.beginPath(); g.moveTo(lx - 8 * k, top + 6 * k); g.lineTo(lx + 8 * k, top + 6 * k); g.lineTo(lx + 90 * k, Y(0.93)); g.lineTo(lx - 90 * k, Y(0.93)); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  g.fillStyle = '#3a3044'; g.fillRect(0, rail, W, 4 * k);
  for (const pn of C.posts) for (const dx of [0, -W]) g.fillRect(sx(pn, 2) + dx, rail, 4 * k, 14 * k);

  // Road markings stream past fastest.
  g.fillStyle = '#ffcc55';
  const dash = 110 * k, off = ((lap(3) * C.side % dash) + dash) % dash;
  for (let x = -dash + off; x < W; x += dash) g.fillRect(x, Y(0.877), 60 * k, 3 * k);
  g.fillStyle = '#c8c0d0'; g.fillRect(0, Y(0.928), W, 2 * k);

  for (const l of C.lanes) for (const car of l.cars) {
    const p = (car.o + u * l.k) % 1, x = (l.dir > 0 ? -0.2 + p * 1.4 : 1.2 - p * 1.4) * W;
    drawCarSide(g, x, l.y, l.s, l.dir, car.c, car.type, k);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

SCENES.coast = {
  label: 'Pacific Coast',
  gen(seed, loop) { coast = genCoast(seed, loop); },
  draw: drawCoast,
};
