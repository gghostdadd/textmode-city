'use strict';
// 3D drive engine: an OutRun-style pseudo-3D road shared by the "3D drive" scenes.
// The camera travels exactly one lap of a closed track per loop, so clips loop seamlessly.
// A track is a ring of segments whose curves and hills are sums of sines with whole periods
// over the ring. Each frame projects the visible segment edges, paints the ground and road
// from near to far (clipping behind hill crests), then draws roadside items and traffic from
// far to near. Traffic laps the track a whole number of times per loop (0 = slower traffic we
// pass, negative = oncoming), so it loops too.
//
// World units: a segment is DRIVE.SEG deep, the road is DRIVE.ROAD from centre to edge.
// Item offsets are in road half-widths (0 = centre, ±1 = road edge).

const DRIVE = { SEG: 200, ROAD: 2000, DRAW: 150, DEPTH: 1 / Math.tan((50 * Math.PI) / 180) };

function makeTrack(r, loop, o) {
  // A multiple of 8 segments so the 4-on/4-off ground stripes wrap cleanly.
  const n = Math.ceil(Math.max(300, loop * o.speed) / 8) * 8;
  const terms = (count, amp) => Array.from({ length: count }, (_, i) => ({ f: i + 1 + Math.floor(r() * 2), a: amp / (i + 1), p: r() }));
  // Hills are given as a maximum road grade (rise per unit run), so their steepness doesn't
  // depend on how long the track is.
  const cT = terms(3, o.curve || 0), hT = terms(3, 1).map(t => ({ ...t, a: ((o.hill || 0) * n * DRIVE.SEG) / (TAU * t.f) / 2.2 * t.a }));
  const wave = (t, i) => t.reduce((s, q) => s + q.a * Math.sin(TAU * ((q.f * i) / n + q.p)), 0);
  const segs = Array.from({ length: n }, (_, i) => ({ i, curve: wave(cT, i), y: wave(hT, i), items: [] }));
  let c = 0;
  for (const s of segs) { s.cum = c; c += s.curve; }
  return { n, segs, len: n * DRIVE.SEG };
}

// Draws one frame. S supplies: horizon (0..1 of height), camH, camX (road half-widths),
// optional bob(u), sky(g, u, curveSum), segment(g, a, b, u), item(g, it, pos, vis, n, u),
// optional car(g, car, pos, u) with traffic [{ x, laps, z0, ... }], optional overlay(g, u).
function driveFrame(g, T, u, S) {
  const W = GW, H = GH, F = W / 2, hz = S.horizon * H, D = DRIVE;
  const camZ = u * T.len, base = Math.floor(camZ / D.SEG), pct = camZ / D.SEG - base;
  const seg = i => T.segs[((i % T.n) + T.n) % T.n];
  const camY = seg(base).y + (seg(base + 1).y - seg(base).y) * pct + S.camH + (S.bob ? S.bob(u) : 0);
  const camX = (S.camX || 0) * D.ROAD;
  S.sky(g, u, seg(base).cum + seg(base).curve * pct);

  // Project every segment edge. Edge n is the near edge of segment base + n.
  let x = 0, dx = -seg(base).curve * pct;
  const vis = [];
  for (let n = 0; n <= D.DRAW + 1; n++) {
    const s = seg(base + n), z = (n - pct) * D.SEG, k = z > 1 ? D.DEPTH / z : D.DEPTH;
    vis.push({ n, s, z, X: W / 2 - k * (camX - x) * F, Y: hz + k * (camY - s.y) * F, R: k * D.ROAD * F, K: k * F, clip: H });
    x += dx; dx += s.curve;
  }
  let maxY = H;
  for (let n = 1; n < D.DRAW; n++) {
    const a = vis[n], b = vis[n + 1];
    a.clip = maxY;
    if (b.Y >= a.Y || b.Y >= maxY) continue;
    S.segment(g, a, b, u);
    maxY = b.Y;
  }

  const items = [];
  for (let n = 1; n < D.DRAW; n++) for (const it of vis[n].s.items) items.push({ n, f: it.f || 0, it, d: n + (it.f || 0) });
  // Items that span several segments (buildings) and started behind the camera are cut to
  // begin at the first visible edge; `off` keeps their per-segment details stable.
  for (let n = -(S.back || 0); n < 1; n++) {
    for (const it of seg(base + n).items) if (it.d && n + it.d > 1) items.push({ n: 1, f: 0, it: { ...it, d: it.d + n - 1, off: 1 - n, cut: true }, d: 1 });
  }
  for (const c of S.traffic || []) {
    const cz = ((((c.z0 + u * c.laps) % 1) + 1) % 1) * T.len;
    const e = ((((cz - camZ) % T.len) + T.len) % T.len) / D.SEG + pct, n = Math.floor(e);
    if (n >= 1 && n < D.DRAW) items.push({ n, f: e - n, car: c, d: e });
  }
  // Items marked `behind` (a back row of buildings) draw before everything else, far to near.
  const key = p => p.d + (p.it && p.it.behind ? 1e4 : 0);
  items.sort((p, q) => key(q) - key(p));
  for (const p of items) {
    const a = vis[p.n], b = vis[p.n + 1], L = (v0, v1) => v0 + (v1 - v0) * p.f;
    const pos = { X: L(a.X, b.X), Y: L(a.Y, b.Y), R: L(a.R, b.R), K: L(a.K, b.K), n: p.n, d: p.d, fade: clamp((D.DRAW - p.d) / 25) };
    const clipped = a.clip < H;
    if (clipped) { g.save(); g.beginPath(); g.rect(0, 0, W, a.clip); g.clip(); }
    if (p.car) S.car(g, p.car, pos, u); else S.item(g, p.it, pos, vis, p.n, u);
    if (clipped) g.restore();
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  if (S.overlay) S.overlay(g, u);
  return vis;
}

// Ground-plane strip between offsets x0..x1 (road half-widths) across a segment.
function dStrip(g, a, b, x0, x1, color) {
  g.fillStyle = color; g.beginPath();
  g.moveTo(a.X + x0 * a.R, a.Y + 0.5); g.lineTo(a.X + x1 * a.R, a.Y + 0.5);
  g.lineTo(b.X + x1 * b.R, b.Y - 0.5); g.lineTo(b.X + x0 * b.R, b.Y - 0.5);
  g.closePath(); g.fill();
}
// Vertical wall at offset xo between heights h0..h1 (world units) across a segment.
function dWall(g, a, b, xo, h0, h1, color) {
  g.fillStyle = color; g.beginPath();
  g.moveTo(a.X + xo * a.R, a.Y - h0 * a.K); g.lineTo(b.X + xo * b.R, b.Y - h0 * b.K);
  g.lineTo(b.X + xo * b.R, b.Y - h1 * b.K); g.lineTo(a.X + xo * a.R, a.Y - h1 * a.K);
  g.closePath(); g.fill();
}
// Point on a segment between its near (f=0) and far (f=1) edges.
function dLerp(a, b, f) { return { X: a.X + (b.X - a.X) * f, Y: a.Y + (b.Y - a.Y) * f, R: a.R + (b.R - a.R) * f, K: a.K + (b.K - a.K) * f }; }

// Pre-rendered sprite: a canvas plus its world width and the anchor point (fraction across)
// that stands on the ground.
function dSprite(wPx, hPx, worldW, draw, ax = 0.5) {
  const c = document.createElement('canvas'); c.width = Math.ceil(wPx); c.height = Math.ceil(hPx);
  draw(c.getContext('2d'), c.width, c.height);
  return { img: c, wW: worldW, ax };
}
function dDraw(g, spr, X, Y, K, alpha = 1, flip = false, scale = 1) {
  const w = spr.wW * K * scale;
  if (w < 0.6) return;
  const h = (w * spr.img.height) / spr.img.width, left = X - (flip ? 1 - spr.ax : spr.ax) * w;
  if (left > GW || left + w < 0 || Y - h > GH) return;
  g.globalAlpha = alpha;
  if (flip) { g.save(); g.translate(left + w, 0); g.scale(-1, 1); g.drawImage(spr.img, 0, Y - h, w, h); g.restore(); }
  else g.drawImage(spr.img, left, Y - h, w, h);
  g.globalAlpha = 1;
}

// Traffic, seen from behind (taillights) or head-on (headlights).
function dCar(g, pos, x, color, front, alpha) {
  const K = pos.K, w = 900 * K, h = 430 * K, cx = pos.X + x * pos.R, y = pos.Y;
  if (w < 1) return;
  g.globalAlpha = alpha;
  g.fillStyle = color; g.beginPath(); g.roundRect(cx - w / 2, y - h, w, h * 0.62, h * 0.1); g.fill();
  g.beginPath(); g.roundRect(cx - w * 0.36, y - h * 1.35, w * 0.72, h * 0.45, h * 0.12); g.fill();
  g.fillStyle = '#14121e'; g.fillRect(cx - w * 0.3, y - h * 1.27, w * 0.6, h * 0.32);
  g.fillStyle = '#08060c'; g.fillRect(cx - w * 0.46, y - h * 0.4, w * 0.16, h * 0.4); g.fillRect(cx + w * 0.3, y - h * 0.4, w * 0.16, h * 0.4);
  g.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    if (front) { glow(g, cx + s * w * 0.34, y - h * 0.66, w * 0.32, '#fff4d0', alpha); glow(g, cx + s * w * 0.34, y - h * 0.66, w * 0.08, '#ffffff', alpha); }
    else { g.globalAlpha = alpha; g.fillStyle = '#ff2030'; g.fillRect(cx + s * w * 0.36 - w * 0.08, y - h * 0.82, w * 0.16, h * 0.14); glow(g, cx + s * w * 0.36, y - h * 0.75, w * 0.2, '#ff2a40', alpha * 0.8); }
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

// Shared sprites.
function palmSprite(seedR, frame, date) {
  const H = date ? 300 : 520, L = H * (date ? 0.42 : 0.3), lean = date ? 0 : (seedR() - 0.5) * 0.3;
  const p = { h: H * 0.86, lean, tw: date ? 26 : 12, L, fronds: date ? 20 : 15, date, rot: seedR() * TAU, ph: seedR(), k: 1, seed: seedR() };
  const w = L * 2.9 + Math.abs(lean) * H, x0 = w / 2 - (lean * p.h) / 2;
  return { p, make: f => dSprite(w, H + L * 0.2, (w / (H + L * 0.2)) * (date ? 3000 : 5500), g => drawPalm(g, x0, H + L * 0.2 - 2, p, f / 4, 1, true), x0 / w) };
}
function pineSprite(r, snow) {
  return dSprite(220, 440, 1600, (g, w, h) => {
    g.fillStyle = '#2a1e18'; g.fillRect(w / 2 - 8, h - 70, 16, 70);
    const tiers = 8;
    for (let t = 0; t < tiers; t++) {
      const f = t / tiers, y = h - 50 - f * (h - 70), hw = (w / 2 - 6) * (1 - f * 0.85);
      g.fillStyle = t % 2 ? '#123a2c' : '#0e3024';
      g.beginPath(); g.moveTo(w / 2 - hw, y); g.lineTo(w / 2, y - 90); g.lineTo(w / 2 + hw, y); g.closePath(); g.fill();
      if (snow) { g.fillStyle = '#d8d8f0'; g.beginPath(); g.moveTo(w / 2 - hw * 0.5, y - 45); g.lineTo(w / 2, y - 90); g.lineTo(w / 2 + hw * 0.6, y - 40); g.lineTo(w / 2 + hw * 0.2, y - 52); g.closePath(); g.fill(); }
    }
  });
}
function rockSprite(r, cols) {
  return dSprite(320, 200, 1400, (g, w, h) => {
    const pts = Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i / 8) * Math.PI; return [w / 2 + Math.cos(a) * w * (0.4 + r() * 0.1), h + Math.sin(a) * h * (0.75 + r() * 0.25)]; });
    g.fillStyle = cols[0]; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.fillStyle = cols[1]; g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[4][0], pts[4][1]); g.lineTo(w * 0.5, h * 0.7); g.closePath(); g.fill();
  });
}
