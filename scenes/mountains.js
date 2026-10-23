'use strict';
// Himalaya: giant snow ranges at alpenglow. Back to front: sky with lenticular clouds, the
// great range (sunlit faces glowing pink, shadow faces blue, snow, couloirs), a darker mid
// range, forested foothills, mist, an alpine lake mirroring it all, and a dark shore with
// pines and a string of prayer flags. A snow plume streams off the highest summit.
// Parallax: the great range stays put (it is far away); the mid range, foothills and
// foreground scroll 1, 2 and 3 screen widths per loop. The foreground is three screens long
// with its own pines on each, and the prayer flags hang on only the first. Without parallax the plume, mist,
// flags and lake carry the motion.

let mtn;

// Midpoint-displacement polyline between two points, for jagged ridges.
function jagLine(r, x0, y0, x1, y1, levels, amp) {
  let pts = [[x0, y0], [x1, y1]];
  for (let l = 0; l < levels; l++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay) || 1;
      const d = (r() - 0.5) * amp * len;
      next.push([(ax + bx) / 2 - ((by - ay) / len) * d, (ay + by) / 2 + ((bx - ax) / len) * d], pts[i]);
    }
    pts = next; amp *= 0.62;
  }
  return pts;
}

// A peak is two faces split by an arête running from the summit to the base.
function genPeak(r, x, top, base, wl, wr) {
  const ax = x + wr * (0.05 + r() * 0.3);
  return {
    x, top, base, wl, wr,
    L: jagLine(r, x - wl, base, x, top, 6, 0.16),
    R: jagLine(r, x, top, x + wr, base, 6, 0.16),
    A: jagLine(r, x, top, ax, base, 6, 0.2),
    snow: 0.22 + r() * 0.25, ph: r(),
    ribs: Array.from({ length: 30 }, () => ({ t: 0.05 + r() * 0.6, lit: r() < 0.5, len: 0.12 + r() * 0.3 })),
  };
}

function drawPeak(g, p, c, sunLeft, k) {
  const poly = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const ab = p.A[p.A.length - 1];
  const left = [...p.L, ...p.A.slice(1)], right = [...p.A, [p.x + p.wr, p.base], ...p.R.slice().reverse()];
  const h = p.base - p.top, snowY = p.top + h * p.snow;
  const snowPoly = () => {
    g.beginPath(); g.moveTo(p.x - p.wl, p.top - 10);
    for (let x = p.x - p.wl; x <= p.x + p.wr; x += 6 * k) {
      const t = (x - p.x) / (p.wl + p.wr);
      g.lineTo(x, snowY + h * 0.14 * Math.abs(Math.sin(TAU * (t * 7 + p.ph))) * Math.abs(Math.sin(TAU * (t * 3 + p.ph * 2))));
    }
    g.lineTo(p.x + p.wr, p.top - 10); g.closePath();
  };
  for (const [face, isLeft] of [[left, true], [right, false]]) {
    const lit = isLeft === sunLeft;
    g.save(); poly(face); g.clip();
    const rock = g.createLinearGradient(0, p.top, 0, p.base);
    rock.addColorStop(0, lit ? c.litRock : c.shRock); rock.addColorStop(1, lit ? c.litRockLow : c.shRockLow);
    g.fillStyle = rock; g.fillRect(p.x - p.wl - 2, p.top - 2, p.wl + p.wr + 4, h + 4);
    g.fillStyle = lit ? c.litSnow : c.shSnow; snowPoly(); g.fill();
    // Rock ribs and couloirs running down the face.
    g.strokeStyle = lit ? c.litRib : c.shRib; g.lineWidth = 3 * k; g.globalAlpha = 0.55;
    for (const rb of p.ribs) {
      if (rb.lit !== isLeft) continue;
      const src = isLeft ? p.L : p.R, [sx, sy] = src[Math.floor((isLeft ? 1 - rb.t : rb.t) * (src.length - 1))];
      const tx = isLeft ? p.x - p.wl * 0.2 : p.x + p.wr * 0.4;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (tx - sx) * rb.len * 0.5, sy + h * rb.len); g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }
  // Bright line along the arête and summit, and haze to push the range back.
  g.strokeStyle = c.arete; g.lineWidth = 2 * k; g.globalAlpha = 0.6;
  g.beginPath(); p.A.slice(0, Math.ceil(p.A.length * 0.5)).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.globalAlpha = c.hazeA; g.fillStyle = c.haze;
  poly([...p.L, ...p.R.slice(1)]); g.fill();
  g.globalAlpha = 1;
  return ab;
}

function genMountains(seed, loop) {
  const r = rng(seed * 6007 + 5), W = GW, H = GH, k = W / 1920;
  const sunLeft = r() < 0.5;
  const pick = a => a[Math.floor(r() * a.length)];

  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.72);
    gr.addColorStop(0, '#04081a'); gr.addColorStop(0.5, '#121a44'); gr.addColorStop(0.82, '#5a3e74'); gr.addColorStop(1, '#d89088');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    glow(g, (sunLeft ? 0.1 : 0.9) * W, 0.7 * H, 0.55 * W, '#ffb080', 0.16);
    g.fillStyle = '#e0e8ff';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + r() * 0.4; g.fillRect(r() * W, r() * 0.25 * H, 2 * k + 1, 2 * k + 1); }
    g.globalAlpha = 1;
    // Lenticular clouds catching the last light.
    for (let i = 0; i < 4; i++) {
      const cx = (0.1 + r() * 0.8) * W, cy = (0.08 + r() * 0.16) * H, rx = (0.08 + r() * 0.1) * W;
      for (let j = 0; j < 3; j++) {
        g.globalAlpha = 0.2 - j * 0.05; g.fillStyle = j ? '#f6c0c8' : '#d890b0';
        g.beginPath(); g.ellipse(cx + j * rx * 0.08, cy - j * 0.006 * H, rx * (1 - j * 0.2), 0.012 * H * (1 - j * 0.25), 0, 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
  });

  // Great range: five or six big peaks, one clearly the giant.
  const n = 5 + Math.floor(r() * 2), giant = Math.floor(r() * n);
  const greatPeaks = Array.from({ length: n }, (_, i) => {
    const hN = i === giant ? 0.46 + r() * 0.05 : 0.22 + r() * 0.16, base = 0.66 * H, top = base - hN * H;
    const x = ((i + 0.25 + r() * 0.5) / n) * W;
    return genPeak(r, x, top, base, hN * H * (1.1 + r() * 0.6), hN * H * (1.1 + r() * 0.6));
  }).sort((a, b) => a.base - a.top - (b.base - b.top));
  const greatC = { litRock: '#c47a88', litRockLow: '#7a4462', shRock: '#262856', shRockLow: '#141634', litSnow: '#fff0e6', shSnow: '#5e6eae', litRib: '#7a3a5e', shRib: '#10122a', arete: '#ffffff', haze: '#8a7ab0', hazeA: 0.07 };
  let summit = null;
  const great = paintLayer(g => {
    for (const p of greatPeaks) {
      drawPeak(g, p, greatC, sunLeft, k);
      if (!summit || p.top < summit.y) summit = { x: p.x, y: p.top };
    }
  });

  // Mid range and foothills tile every screen width so they can scroll.
  const midPeaks = upTo(8, (_, i) => {
    const hN = 0.08 + r() * 0.13, base = 0.71 * H;
    return genPeak(r, (((i % 8) + r()) / 8) * W, base - hN * H, base, hN * H * (1.2 + r()), hN * H * (1.2 + r()));
  }).sort((a, b) => a.base - a.top - (b.base - b.top));
  const midC = { litRock: '#7a4a66', litRockLow: '#3a2440', shRock: '#1a1c3e', shRockLow: '#0e1028', litSnow: '#f0c8c8', shSnow: '#46548a', litRib: '#3a2240', shRib: '#0a0c20', arete: '#ffe0e0', haze: '#6a5a90', hazeA: 0.06 };
  const mid = paintLayer(g => { for (const dx of [-W, 0, W]) for (const p of midPeaks) { const q = { ...p, x: p.x + dx, L: p.L.map(([x, y]) => [x + dx, y]), R: p.R.map(([x, y]) => [x + dx, y]), A: p.A.map(([x, y]) => [x + dx, y]) }; drawPeak(g, q, midC, sunLeft, k); } });

  const hillT = Array.from({ length: 4 }, (_, i) => ({ f: i * 2 + 2 + Math.floor(r() * 2), a: 0.012 / (i + 1), p: r() }));
  const hillY = x => 0.715 + hillT.reduce((s, q) => s + q.a * Math.sin(TAU * (q.f * x + q.p)), 0);
  const trees = upTo(360, () => ({ x: r(), d: r() ** 1.5, h: 6 + r() * 10, c: pick(['#0c1c24', '#10242a', '#16303a']) }));
  const foot = paintLayer(g => {
    g.fillStyle = '#0e1c2a'; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= 1.0001; x += 0.004) g.lineTo(x * W, hillY(x) * H);
    g.lineTo(W, H); g.fill();
    for (const t of trees) for (const dx of [-W, 0, W]) {
      const x = t.x * W + dx, y = (hillY(t.x) + t.d * 0.035) * H, hh = t.h * k * (1 - t.d * 0.4);
      g.fillStyle = t.c; g.beginPath(); g.moveTo(x - hh * 0.35, y + 2); g.lineTo(x, y - hh); g.lineTo(x + hh * 0.35, y + 2); g.fill();
    }
  });

  const lakeY = Math.round(0.75 * rows) * ch;
  // Shore and pines over a three-screen strip (x in 0..3), periodic over that span.
  const shoreY = x => 0.9 + 0.02 * Math.sin(TAU * ((x * 2) / 3 + 0.3)) + 0.012 * Math.sin(TAU * ((x * 7) / 3)) + 0.008 * Math.sin(TAU * x * 5);
  const pine = x => ({ x, h: (0.2 + r() * 0.22) * H, w: 0.04 + r() * 0.025, tiers: 7 + Math.floor(r() * 4) });
  const pines = [
    [0.02, 0.07, 0.11, 0.86, 0.91, 0.96].map(x => pine(x + (r() - 0.5) * 0.02)),
    [0.15, 0.2, 0.55, 0.62, 0.68].map(x => pine(x + (r() - 0.5) * 0.04)),
    [0.05, 0.35, 0.4, 0.78, 0.84, 0.88].map(x => pine(x + (r() - 0.5) * 0.04)),
  ];
  const flagA = { x: 0.11, y: 0.56 }, flagB = { x: 0.36, y: 0.79 };
  const FLAG = ['#3a6aff', '#f4f4f4', '#ff3a3a', '#3ac85a', '#ffd03a'];

  return {
    sky, great, mid, foot, lakeY, shoreY, pines, flagA, flagB, FLAG, k, sunLeft,
    summit, plume: Array.from({ length: 90 }, () => ({ o: r(), m: Math.max(1, Math.round(loop * (0.3 + r() * 0.3))), dy: (r() - 0.5) * 0.04, len: 0.12 + r() * 0.16 })),
    mist: upTo(12, () => ({ x: r(), y: 0.64 + r() * 0.08, rx: 0.06 + r() * 0.08, a: 0.05 + r() * 0.06 })),
    flagK: Array.from({ length: 9 }, () => 2 + Math.floor(r() * 2)),
    sparks: Array.from({ length: 50 }, () => ({ x: r(), y: r() })),
  };
}

function drawMountains(u) {
  const g = sctx, M = mtn, W = GW, H = GH, k = M.k;
  const lap = n => (cfg.pan ? u * W * n : 0);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  blit(g, M.sky);
  blit(g, M.great);

  // Snow plume streaming off the giant's summit, away from the sun.
  const dir = M.sunLeft ? 1 : -1;
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffe8e0';
  for (const p of M.plume) {
    const t = (p.o + u * p.m) % 1;
    g.globalAlpha = (1 - t) * 0.35;
    const x = M.summit.x + dir * t * p.len * W, y = M.summit.y + (p.dy + t * 0.03) * H - Math.sin(t * Math.PI) * 0.01 * H;
    g.beginPath(); g.ellipse(x, y, (4 + t * 24) * k, (2 + t * 8) * k, 0, 0, TAU); g.fill();
  }
  // Mist pooling at the foot of the great range; one lap of a half-width pattern per loop.
  g.fillStyle = '#e0c8e0';
  const mo = (u * 0.5) % 0.5;
  for (const m of M.mist) for (const s of [0, 0.5, 1]) {
    const x = ((((m.x * 0.5 + s - mo) % 1.5) + 1.5) % 1.5 - 0.25) * W;
    g.globalAlpha = m.a; g.beginPath(); g.ellipse(x, m.y * H, m.rx * W, 0.018 * H, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  blitTile(g, M.mid, lap(1));
  blitTile(g, M.foot, lap(2));

  // Alpine lake: mirror everything above the waterline with a gentle ripple.
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const hz = Math.round((M.lakeY * SH) / GH), n = SH - hz;
  for (let d = 0; d < n; d++) {
    const src = hz - 1 - d;
    if (src < 0) break;
    const t = d / n;
    g.globalAlpha = 0.75 - t * 0.35;
    g.drawImage(sc, 0, src, SW, 1, Math.sin(d * 0.9 + u * TAU * 3) * (0.4 + t * 2) * (SW / 640), hz + d, SW, 1);
  }
  g.restore();
  g.globalAlpha = 0.35; g.fillStyle = '#0a1834'; g.fillRect(0, M.lakeY, W, H - M.lakeY);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffd8c8';
  const step = Math.floor(u * cfg.loop * 4);
  M.sparks.forEach((s, i) => {
    if (hash(i, step) < 0.6) return;
    g.globalAlpha = 0.5; g.fillRect(s.x * W, M.lakeY + s.y * (H * 0.9 - M.lakeY), 10 * k, 2 * k);
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  // Foreground: shore, pines and prayer flags on a strip three screens long.
  const span = 3 * W, base0 = -(((lap(3) % span) + span) % span);
  for (let j = -1; j < 4; j++) {
    const sx = base0 + j * W, screen = ((j % 3) + 3) % 3;
    if (sx > W || sx + W < 0) continue;
    g.fillStyle = '#05070c'; g.beginPath(); g.moveTo(sx, H);
    for (let x = 0; x <= 1.0001; x += 0.005) g.lineTo(sx + x * W, M.shoreY(screen + x) * H);
    g.lineTo(sx + W, H); g.fill();
    for (const p of M.pines[screen]) {
      const px = sx + p.x * W, base = M.shoreY(screen + p.x) * H + 4;
      g.fillStyle = '#04060a'; g.fillRect(px - 3 * k, base - p.h, 6 * k, p.h);
      for (let t = 0; t < p.tiers; t++) {
        const f = t / p.tiers, y = base - p.h * (0.15 + f * 0.85), w = p.w * W * (1 - f) * 0.5 + 4 * k;
        g.beginPath(); g.moveTo(px - w, y + p.h * 0.1); g.lineTo(px, y - p.h * 0.08); g.lineTo(px + w, y + p.h * 0.1); g.fill();
      }
    }
    if (screen !== 0) continue;
    // Prayer flags on a sagging line between a pine and a pole.
    const ax = sx + M.flagA.x * W, ay = M.flagA.y * H, bx = sx + M.flagB.x * W, by = M.flagB.y * H;
    g.fillStyle = '#05070c'; g.fillRect(bx - 2 * k, by, 4 * k, M.shoreY(M.flagB.x) * H - by + 4);
    g.strokeStyle = '#2a2a30'; g.lineWidth = 1.5 * k;
    const at = t => [ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(Math.PI * t) * 0.05 * H];
    g.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = at(i / 20); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    M.flagK.forEach((kk, i) => {
      const [x, y] = at((i + 0.5) / M.flagK.length), sway = Math.sin(TAU * (u * kk) + i * 0.7) * 7 * k;
      g.fillStyle = M.FLAG[i % M.FLAG.length];
      g.beginPath(); g.moveTo(x - 8 * k, y); g.lineTo(x + 8 * k, y); g.lineTo(x + 8 * k + sway, y + 20 * k); g.lineTo(x - 8 * k + sway, y + 20 * k); g.fill();
    });
  }
  g.globalAlpha = 1;
}

SCENES.mountains = {
  label: 'Himalaya',
  gen(seed, loop) { mtn = genMountains(seed, loop); },
  draw: drawMountains,
};
