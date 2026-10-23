'use strict';
// Jungle Falls: a twilight gorge. A cliff wall spans the frame; a two-tier waterfall drops
// from its centre into an oval pond whose ripples spread from where the water lands, framed by jungle canopy, hanging vines and big foreground leaves,
// with mist, light shafts, fireflies, drifting leaves and one leaping fish per loop.
// Terrain is painted once per rebuild into static layers; each frame adds water and life.
// The falls and pond sit at the centre of the frame; the seed mirrors the moon, the side
// stream and the light shafts.
// Parallax drifts the clouds (one lap per loop); the land itself stays put.

let falls;

function genFalls(seed, loop) {
  const r = rng(seed * 7121 + 3), W = GW, H = GH, k = W / 1920;
  const side = r() < 0.5 ? 1 : -1;
  const X = x => (side > 0 ? x : 1 - x) * W, Y = y => y * H;
  const pick = a => a[Math.floor(r() * a.length)];
  const terms = (n, amp) => Array.from({ length: n }, (_, i) => ({ f: i + 1 + Math.floor(r() * 3), a: amp / (i + 1.2), p: r() }));
  const ridge = (base, t) => x => base + t.reduce((s, q) => s + q.a * Math.sin(TAU * (q.f * x + q.p)), 0);
  const ridgeA = ridge(0.4, terms(5, 0.05)), ridgeB = ridge(0.5, terms(5, 0.035)), trees = ridge(0.585, terms(6, 0.016));
  const hillL = x => 0.52 + 0.15 * clamp(x / 0.4) ** 1.4 + 0.02 * Math.sin(TAU * (x * 3 + 0.2)) + 0.012 * Math.sin(TAU * x * 7);
  const hillR = x => hillL(1 - x) + 0.015 * Math.sin(TAU * x * 5);

  // Two centred falls on a cliff wall that spans the frame, in normalized coordinates.
  const up = { x0: 0.478, x1: 0.522, top: 0.155, bot: 0.385, out: 0 };
  const low = { x0: 0.452, x1: 0.548, top: 0.395, bot: 0.648, out: 0 };
  const cliff = [[-0.02, 0.7], [-0.02, 0.2], [0.06, 0.18], [0.14, 0.2], [0.22, 0.17], [0.3, 0.165], [0.38, 0.152], [0.45, 0.147], [0.5, 0.142],
    [0.55, 0.147], [0.62, 0.152], [0.7, 0.168], [0.78, 0.172], [0.86, 0.2], [0.94, 0.18], [1.02, 0.19], [1.02, 0.7]]
    .map(([x, y], i, a) => [x, y + (i > 1 && i < a.length - 2 ? (r() - 0.35) * 0.09 * clamp((Math.abs(x - 0.5) - 0.06) / 0.2) : 0)]);

  // Pond: an oval at the foot of the falls; ripples spread from where the water lands.
  const pond = { x: X(0.5), y: Y(0.775), rx: 0.3 * W, ry: 0.115 * H, ox: X(0.5), oy: Y(0.685) };

  const blobs = (g, n, xr, yAt, depth, rad, cols) => {
    for (let i = 0; i < n; i++) {
      const xn = xr[0] + r() * (xr[1] - xr[0]), d = r();
      g.fillStyle = cols[Math.min(cols.length - 1, Math.floor(d * cols.length + r() * 0.8))];
      g.beginPath(); g.ellipse(X(xn), Y(yAt(xn) + d * depth), (rad[0] + r() * rad[1]) * k, (rad[0] + r() * rad[1]) * k * 0.75, r() * 3, 0, TAU); g.fill();
    }
  };
  const fillUnder = (g, f, x0, x1, yBottom, color) => {
    g.fillStyle = color; g.beginPath(); g.moveTo(X(x0), Y(yBottom));
    for (let x = x0; x <= x1 + 1e-9; x += 0.004) g.lineTo(X(x), Y(f(x)));
    g.lineTo(X(x1), Y(yBottom)); g.fill();
  };

  const skyGrad = g => {
    const gr = g.createLinearGradient(0, 0, 0, Y(0.62));
    gr.addColorStop(0, '#02060c'); gr.addColorStop(0.55, '#071a28'); gr.addColorStop(0.85, '#1f3e44'); gr.addColorStop(1, '#7a6e54');
    return gr;
  };
  const moon = { x: X(0.17), y: Y(0.075), r: 0.04 * H };
  const sky = paintLayer(g => {
    g.fillStyle = skyGrad(g); g.fillRect(0, 0, W, H);
    glow(g, X(0.3), Y(0.52), 0.45 * W, '#ffbe78', 0.18);
    g.save(); g.beginPath(); g.arc(moon.x, moon.y, moon.r, 0, TAU); g.clip();
    g.fillStyle = '#f4ecd0'; g.fillRect(moon.x - moon.r, moon.y - moon.r, moon.r * 2, moon.r * 2);
    g.fillStyle = skyGrad(g); g.beginPath(); g.arc(moon.x + side * moon.r * 0.45, moon.y - moon.r * 0.18, moon.r * 0.9, 0, TAU); g.fill();
    g.restore();
    glow(g, moon.x, moon.y, moon.r * 3, '#f4ecd0', 0.12);
  });

  const far = paintLayer(g => {
    fillUnder(g, ridgeA, -0.01, 1.01, 0.8, '#1c3440');
    const mist = g.createLinearGradient(0, Y(0.44), 0, Y(0.54));
    mist.addColorStop(0, 'rgba(200,225,230,0)'); mist.addColorStop(0.5, 'rgba(200,225,230,.1)'); mist.addColorStop(1, 'rgba(200,225,230,0)');
    g.fillStyle = mist; g.fillRect(0, Y(0.44), W, Y(0.1));
    fillUnder(g, ridgeB, -0.01, 1.01, 0.8, '#122630');
  });

  const rocks = [];
  const near = paintLayer(g => {
    // Distant tree line, then the hill on the open side.
    fillUnder(g, trees, -0.01, 1.01, 0.8, '#0a1f14');
    blobs(g, 320, [0, 1], trees, 0.05, [7, 12], ['#2a6e32', '#1f5a2c', '#174424', '#10331b']);
    g.fillStyle = '#08180e'; g.fillRect(0, Y(0.62), W, H - Y(0.62));

    // Cliff: rock gradient, strata, facets and moss, clipped to its outline.
    const path = () => { g.beginPath(); cliff.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); };
    const rock = g.createLinearGradient(0, Y(0.08), 0, Y(0.7));
    rock.addColorStop(0, '#222e2a'); rock.addColorStop(1, '#0d1311');
    path(); g.fillStyle = rock; g.fill();
    g.save(); path(); g.clip();
    for (let i = 0; i < 150; i++) {
      g.fillStyle = pick(['#3a4a42', '#1a2420', '#34443c']); g.globalAlpha = 0.6;
      const fx = r(), fy = 0.17 + r() * 0.53;
      g.beginPath(); g.moveTo(X(fx), Y(fy)); g.lineTo(X(fx + (r() - 0.3) * 0.04), Y(fy + 0.01 + r() * 0.03)); g.lineTo(X(fx + (r() - 0.7) * 0.04), Y(fy + 0.02 + r() * 0.03)); g.fill();
    }
    g.globalAlpha = 0.7; g.strokeStyle = '#0c1210'; g.lineWidth = 2.5 * k;
    for (let y = 0.12; y < 0.7; y += 0.022 + r() * 0.012) {
      g.beginPath();
      for (let x = -0.02; x <= 1.02; x += 0.01) { const yy = y + 0.004 * Math.sin(TAU * (x * 9 + y * 13)); x === -0.02 ? g.moveTo(X(x), Y(yy)) : g.lineTo(X(x), Y(yy)); }
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 380; i++) {
      const mxn = r(), myn = 0.16 + r() ** 1.8 * 0.54;
      g.fillStyle = pick(['#2f6a34', '#4f9a44', '#24552a']);
      g.beginPath(); g.ellipse(X(mxn), Y(myn), (5 + r() * 9) * k, (3 + r() * 5) * k, 0, 0, TAU); g.fill();
    }
    g.restore();
    // Jungle cap along the cliff top and moss on the ledge.
    const topAt = x => { for (let i = 1; i < cliff.length; i++) { const [ax, ay] = cliff[i - 1], [bx, by] = cliff[i]; if (x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && ay < 0.4 && by < 0.4) return ay + ((by - ay) * (x - ax)) / ((bx - ax) || 1); } return 0.12; };
    blobs(g, 650, [0, 1], x => topAt(x) - 0.02, 0.05, [8, 14], ['#4f9a44', '#3c8a3c', '#2a6e32', '#1f5a2c']);
    // The ledge between the two tiers: a rock shelf with moss.
    g.fillStyle = '#2e3c36'; g.fillRect(X(0.43), Y(0.378), X(0.57) - X(0.43), Y(0.02));
    g.fillStyle = '#121a17'; g.fillRect(X(0.43), Y(0.396), X(0.57) - X(0.43), Y(0.006));
    blobs(g, 60, [0.43, 0.57], () => 0.372, 0.012, [5, 8], ['#4f9a44', '#3c8a3c', '#2c7434']);

    // Jungle hills in front of the cliff base on both sides.
    for (const [f, x0, x1] of [[hillL, -0.01, 0.44], [hillR, 0.56, 1.01]]) {
      fillUnder(g, f, x0, x1, 1, '#0a2414');
      blobs(g, 480, [x0, x1], f, 0.28, [9, 16], ['#3c8a3c', '#2c7434', '#1f5a2c', '#153f22', '#0f3019', '#0b2414']);
    }
    // Pond with a stony, grassy rim; the top of the rim stays open where the falls pour in.
    const water = g.createLinearGradient(0, pond.y - pond.ry, 0, pond.y + pond.ry);
    water.addColorStop(0, '#1e5a64'); water.addColorStop(0.35, '#0e4450'); water.addColorStop(1, '#082a34');
    g.fillStyle = water; g.beginPath(); g.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, TAU); g.fill();
    const smear = g.createLinearGradient(0, pond.y - pond.ry, 0, pond.y + pond.ry * 0.6);
    smear.addColorStop(0, 'rgba(160,220,230,.35)'); smear.addColorStop(1, 'rgba(160,220,230,0)');
    g.fillStyle = smear; g.fillRect(pond.x - 0.05 * W, pond.y - pond.ry, 0.1 * W, pond.ry * 1.6);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU;
      if (Math.sin(a) < -0.8) continue;
      const x = pond.x + Math.cos(a) * pond.rx * (1 + r() * 0.03), y = pond.y + Math.sin(a) * pond.ry * (1 + r() * 0.06), s = 0.6 + (y / H) * 0.8;
      g.fillStyle = pick(['#26302c', '#3a4640', '#1c2420']);
      g.beginPath(); g.ellipse(x, y, (8 + r() * 12) * k * s, (4 + r() * 6) * k * s, 0, 0, TAU); g.fill();
      if (Math.sin(a) > -0.2) {
        g.strokeStyle = pick(['#3f8f3e', '#5fae4a']); g.lineWidth = 2 * k;
        for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + j * 6 * k * s, y - (10 + r() * 12) * k * s); g.stroke(); }
      }
    }
    for (const a of [Math.PI * 0.92, Math.PI * 0.12, Math.PI * 1.12 + r() * 0.2, -0.15]) {
      const rk = { x: pond.x + Math.cos(a) * pond.rx * 0.88, y: pond.y + Math.sin(a) * pond.ry * 0.85, rx: (26 + r() * 16) * k, ry: (12 + r() * 8) * k };
      rocks.push(rk);
      g.fillStyle = '#1a2420'; g.beginPath(); g.ellipse(rk.x, rk.y, rk.rx, rk.ry, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a4a42'; g.beginPath(); g.ellipse(rk.x - rk.rx * 0.2, rk.y - rk.ry * 0.4, rk.rx * 0.6, rk.ry * 0.4, 0, 0, TAU); g.fill();
    }
  });

  // Moving parts. Speeds are whole cycles per loop.
  const cyc = (lo, hi) => Math.max(1, Math.round(loop * (lo + r() * (hi - lo))));
  const fallPx = (f, big) => ({
    xa: Math.min(X(f.x0), X(f.x1)), xb: Math.max(X(f.x0), X(f.x1)), top: Y(f.top), bot: Y(f.bot), out: f.out * W, dir: -side, big,
    streaks: Array.from({ length: Math.round(((f.x1 - f.x0) * W) / (6 * k)) * 3 }, () => ({ x: r(), ph: r(), k: cyc(1.2, 1.8), len: (30 + r() * 60) * k, a: 0.4 + r() * 0.5, c: r() < 0.6 ? '#ffffff' : '#bdf2ff' })),
    spray: Array.from({ length: big ? 60 : 24 }, () => ({ d: r() < 0.5 ? -1 : 1, o: r(), m: cyc(0.4, 0.9), spread: (20 + r() * 90) * k * (big ? 1 : 0.6), rise: (20 + r() * 70) * k * (big ? 1 : 0.6) })),
    foamK: cyc(0.8, 1.2),
  });
  // A thin side stream running down the cliff face into the hill.
  const distX = X(0.21), distant = {
    xa: distX - 6 * k, xb: distX + 6 * k, top: Y(0.19), bot: Y(hillL(0.21)) + 10, out: 0, dir: 0,
    streaks: Array.from({ length: 10 }, () => ({ x: r(), ph: r(), k: cyc(1.0, 1.4), len: 30 * k, a: 0.6, c: '#d6f4ff' })), spray: [], foamK: 1,
  };

  return {
    sky, far, near, rocks, pond, side, X, Y, k, distant,
    falls: [fallPx(up, false), fallPx(low, true)],
    ripples: { n: 7, k: Math.max(1, Math.round(loop / 2)) },
    sparkles: Array.from({ length: 70 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * 0.92; return { x: pond.x + Math.cos(a) * pond.rx * d, y: pond.y + Math.sin(a) * pond.ry * d, w: (6 + r() * 14) * k }; }),
    stars: Array.from({ length: 30 }, () => ({ x: r() * W, y: r() * Y(0.3), b: 0.3 + r() * 0.6 })),
    clouds: Array.from({ length: 6 }, () => ({ x: r(), y: 0.06 + r() * 0.22, rx: 0.08 + r() * 0.1, ry: 0.012 + r() * 0.015 })),
    flies: upTo(40, () => ({ x: X(0.04 + r() * 0.92), y: Y(0.45 + r() * 0.45), ax: (20 + r() * 50) * k, ay: (10 + r() * 30) * k, fx: 1 + Math.floor(r() * 2), fy: 1 + Math.floor(r() * 3), p: r(), q: r(), m: 2 + Math.floor(r() * 3), o: r() })),
    drift: upTo(7, () => ({ x0: r() * W, y0: r(), k: 1, p: r(), c: pick(['#c8a040', '#7fbf4a', '#a8c84a']) })),
    shafts: Array.from({ length: 3 }, (_, i) => ({ x: X(0.06 + i * 0.11 + r() * 0.05), w: (40 + r() * 70) * k, lean: side * (0.15 + r() * 0.12) * H, ph: r() })),
    vines: Array.from({ length: 8 }, (_, i) => ({ x: X(i < 4 ? 0.02 + i * 0.06 + r() * 0.03 : 0.76 + (i - 4) * 0.06 + r() * 0.03), len: (0.18 + r() * 0.3) * H, ph: r(), k: r() < 0.5 ? 1 : 2 })),
    leaves: [
      ...Array.from({ length: 7 }, () => ({ x: X(-0.02 + r() * 0.16), y: Y(1.02), a: -Math.PI / 2 + side * (0.3 + r() * 0.9), L: (0.16 + r() * 0.18) * H, w: 0.35 + r() * 0.15, c: pick(['#1d5a2a', '#2c7a34', '#3f9a3e', '#24662e']), ph: r(), k: r() < 0.5 ? 1 : 2 })),
      ...Array.from({ length: 5 }, () => ({ x: X(0.86 + r() * 0.16), y: Y(1.02), a: -Math.PI / 2 - side * (0.3 + r() * 0.8), L: (0.12 + r() * 0.14) * H, w: 0.35 + r() * 0.15, c: pick(['#1d5a2a', '#2c7a34', '#3f9a3e']), ph: r(), k: r() < 0.5 ? 1 : 2 })),
    ],
    fish: { x: pond.x + (r() < 0.5 ? -1 : 1) * (0.12 + r() * 0.08) * W, y: pond.y + 0.03 * H, u0: 0.3 + r() * 0.4 },
  };
}

function drawWater(g, f, u, lw) {
  const span = f.bot - f.top, off = t => f.dir * f.out * (1 - (1 - Math.min(1, t * 3)) ** 2);
  if (f.out || f.big !== undefined) {
    const body = g.createLinearGradient(0, f.top, 0, f.bot);
    body.addColorStop(0, 'rgba(120,190,210,.22)'); body.addColorStop(1, 'rgba(200,240,250,.45)');
    g.fillStyle = body; g.beginPath();
    for (let i = 0; i <= 10; i++) g.lineTo(f.xa + off(i / 10), f.top + (span * i) / 10);
    for (let i = 10; i >= 0; i--) g.lineTo(f.xb + off(i / 10), f.top + (span * i) / 10);
    g.fill();
  }
  g.globalCompositeOperation = 'lighter'; g.lineWidth = lw; g.lineCap = 'round';
  for (const s of f.streaks) {
    let y0 = f.top + ((s.ph + u * s.k) % 1) * (span + s.len) - s.len, y1 = y0 + s.len;
    y0 = Math.max(f.top, y0); y1 = Math.min(f.bot, y1);
    if (y1 <= y0) continue;
    const x = f.xa + s.x * (f.xb - f.xa);
    g.strokeStyle = s.c; g.globalAlpha = s.a;
    g.beginPath(); g.moveTo(x + off((y0 - f.top) / span), y0); g.lineTo(x + off((y1 - f.top) / span), y1); g.stroke();
  }
  g.globalAlpha = 1;
  if (f.big === undefined) { g.globalCompositeOperation = 'source-over'; return; }
  g.fillStyle = '#e8ffff'; g.fillRect(f.xa, f.top - 2, f.xb - f.xa, 4);
  const base = f.bot, mid = (f.xa + f.xb) / 2 + off(1), k = falls.k;
  g.fillStyle = 'rgba(235,250,255,.55)';
  for (let i = 0; i < 6; i++) {
    const rr = (10 + 6 * Math.sin(TAU * (u * f.foamK + i * 0.37))) * k * (f.big ? 1.6 : 1);
    g.beginPath(); g.ellipse(f.xa + ((i + 0.5) / 6) * (f.xb - f.xa) + off(1), base, rr * 1.5, rr * 0.6, 0, 0, TAU); g.fill();
  }
  glow(g, mid, base, (f.big ? 0.12 : 0.06) * GW * (1 + 0.08 * Math.sin(u * TAU * 2)), '#dff6ff', 0.32);
  g.fillStyle = '#ffffff';
  for (const s of f.spray) {
    const p = (s.o + u * s.m) % 1;
    g.globalAlpha = (1 - p) * 0.6;
    g.fillRect(mid + s.d * p * s.spread, base - p * s.rise, 4 * k, 4 * k);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

function drawLeaf(g, x, y, a, L, w, color) {
  const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a) * L * w, ny = Math.cos(a) * L * w;
  const mx = x + Math.cos(a) * L * 0.5, my = y + Math.sin(a) * L * 0.5;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx, my - ny, x, y); g.fill();
  g.strokeStyle = 'rgba(160,220,120,.55)'; g.lineWidth = Math.max(1.5, L * 0.012);
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  for (let i = 1; i < 5; i++) {
    const t = i / 5, px = x + (ex - x) * t, py = y + (ey - y) * t, s = Math.sin(Math.PI * t) * 0.8;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + nx * s * 0.8 + Math.cos(a) * L * 0.08, py + ny * s * 0.8 + Math.sin(a) * L * 0.08);
    g.moveTo(px, py); g.lineTo(px - nx * s * 0.8 + Math.cos(a) * L * 0.08, py - ny * s * 0.8 + Math.sin(a) * L * 0.08); g.stroke();
  }
}

function drawFalls(u) {
  const g = sctx, F = falls, W = GW, H = GH, k = F.k, step = Math.floor(u * cfg.loop * 2);
  const lw = clamp(cw * 0.3, 2, 5);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  blit(g, F.sky);
  g.fillStyle = '#e8f0ff';
  F.stars.forEach((s, i) => { if (hash(i, step) > 0.2) { g.globalAlpha = s.b; g.fillRect(s.x, s.y, 3, 3); } });
  g.globalAlpha = 0.28; g.fillStyle = '#9a8c96';
  for (const c of F.clouds) {
    const cx = (((c.x + (cfg.pan ? u : 0)) % 1) + 1) % 1;
    for (const x of [cx, cx - 1, cx + 1]) { g.beginPath(); g.ellipse(x * W, c.y * H, c.rx * W, c.ry * H, 0, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
  blit(g, F.far);
  blit(g, F.near);
  drawWater(g, F.distant, u, Math.max(2, lw * 0.6));

  for (const f of F.falls) drawWater(g, f, u, lw);

  // Ripples: rings spread from where the falls land and fade toward the rim.
  const P = F.pond;
  g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.clip();
  for (let i = 0; i < F.ripples.n; i++) {
    const p = (i / F.ripples.n + u * F.ripples.k) % 1, rx = 0.03 * W + p * P.rx * 1.05, ry = rx * (P.ry / P.rx), cy = P.oy + p * (P.y - P.oy) * 0.6;
    const a = (1 - p) ** 1.2 * Math.min(1, p * 6);
    g.lineWidth = Math.max(2, (4.5 - p * 2) * k);
    g.globalAlpha = a * 0.35; g.strokeStyle = '#06222a';
    g.beginPath(); g.ellipse(P.ox, cy, rx * 0.97, ry * 0.97, 0, 0, TAU); g.stroke();
    g.globalAlpha = a * 0.95; g.strokeStyle = '#d0f8fc';
    g.beginPath(); g.ellipse(P.ox, cy, rx, ry, 0, 0, TAU); g.stroke();
  }
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#d8f8ff';
  const glint = Math.floor(u * cfg.loop * 4);
  F.sparkles.forEach((sp, i) => { if (hash(i, glint) > 0.65) { g.globalAlpha = 0.45; g.fillRect(sp.x, sp.y, sp.w, 2 * k); } });
  g.restore();
  // Foam lapping round the rim boulders.
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#e8fbff';
  F.rocks.forEach((rk, i) => {
    g.globalAlpha = 0.3 + 0.25 * Math.sin(TAU * (u * 2) + i * 1.7); g.lineWidth = Math.max(1.5, 2 * k);
    g.beginPath(); g.ellipse(rk.x, rk.y + rk.ry * 0.3, rk.rx * 1.15, rk.ry * 0.7, 0, 0, Math.PI); g.stroke();
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  // One fish leap per loop.
  const fq = (u - F.fish.u0) / 0.09;
  if (fq >= 0 && fq <= 1) {
    const fx = F.fish.x + (fq - 0.5) * 0.06 * W, fy = F.fish.y - Math.sin(fq * Math.PI) * 0.07 * H;
    g.fillStyle = '#ff8a3a';
    g.beginPath(); g.ellipse(fx, fy, 13 * k, 5 * k, Math.atan2(-Math.cos(fq * Math.PI) * 0.07 * H * Math.PI, 0.06 * W), 0, TAU); g.fill();
    g.fillStyle = '#e8fbff';
    for (const e of [0, 1]) if (Math.abs(fq - e) < 0.15) for (let i = 0; i < 5; i++) g.fillRect(F.fish.x + (e - 0.5) * 0.06 * W + (i - 2) * 6 * k, F.fish.y - (1 - Math.abs(fq - e) / 0.15) * (6 + (i % 2) * 6) * k, 3 * k, 3 * k);
  }

  g.globalCompositeOperation = 'lighter';
  for (const f of F.flies) {
    const b = Math.max(0, Math.sin(TAU * (f.m * u + f.o))) ** 2;
    if (b < 0.05) continue;
    const x = f.x + f.ax * Math.sin(TAU * (f.fx * u + f.p)), y = f.y + f.ay * Math.sin(TAU * (f.fy * u + f.q));
    glow(g, x, y, 16 * k, '#e8ff70', b * 0.9);
    g.globalAlpha = b; g.fillStyle = '#fbffc0'; g.fillRect(x - 2 * k, y - 2 * k, 4 * k, 4 * k); g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'source-over';

  // Hanging vines swing gently from the top edge.
  for (const v of F.vines) {
    let x = v.x, y = 0;
    g.strokeStyle = '#244a26'; g.lineWidth = 3 * k;
    const n = 12;
    for (let j = 1; j <= n; j++) {
      const a = Math.PI / 2 + Math.sin(TAU * (u * v.k) + v.ph * TAU + j * 0.25) * 0.02 * j;
      const nx = x + Math.cos(a) * (v.len / n), ny = y + Math.sin(a) * (v.len / n);
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      if (j % 2 === 0) { g.fillStyle = j % 4 ? '#3c8a3a' : '#2c7434'; g.beginPath(); g.ellipse(nx + (j % 4 ? 7 : -7) * k, ny, 8 * k, 4 * k, j % 4 ? 0.5 : -0.5, 0, TAU); g.fill(); }
      x = nx; y = ny;
    }
  }
  for (const l of F.leaves) drawLeaf(g, l.x, l.y, l.a + Math.sin(TAU * (u * l.k) + l.ph * TAU) * 0.05, l.L, l.w, l.c);

  for (const d of F.drift) {
    const p = (d.y0 + u * d.k) % 1, x = d.x0 + Math.sin(TAU * (u * d.k * 2) + d.p * TAU) * 0.03 * W, y = p * 1.1 * H - 0.05 * H;
    g.fillStyle = d.c; g.beginPath(); g.ellipse(x, y, 7 * k, 3 * k, TAU * (u * d.k * 3 + d.p), 0, TAU); g.fill();
  }

  // Light shafts through the canopy, shimmering slightly.
  g.globalCompositeOperation = 'lighter';
  for (const s of F.shafts) {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.9);
    gr.addColorStop(0, 'rgba(255,225,160,.12)'); gr.addColorStop(1, 'rgba(255,225,160,0)');
    g.globalAlpha = 0.75 + 0.25 * Math.sin(TAU * (u * 2) + s.ph * TAU); g.fillStyle = gr;
    g.beginPath(); g.moveTo(s.x - s.w / 2, 0); g.lineTo(s.x + s.w / 2, 0); g.lineTo(s.x + s.w * 1.4 + s.lean, H * 0.9); g.lineTo(s.x - s.w * 1.4 + s.lean, H * 0.9); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt';
}

SCENES.falls = {
  label: 'Jungle Falls',
  gen(seed, loop) { falls = genFalls(seed, loop); },
  draw: drawFalls,
};
