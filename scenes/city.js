'use strict';
// Neon City: a cyberpunk skyline drawn in layers, back to front: sky and ringed planet,
// megastructures, searchlights, towers with holo billboards, flying traffic, a monorail,
// low-rise rooftops, and a wet street that mirrors it all.
// The layout comes from the seed; motion comes from the loop phase u (0..1). Every motion
// repeats a whole number of times per loop, so the last frame flows back into the first.
// Buildings snap to the character grid so windows and signs land on whole cells.
//
// Helpers (glow, periodic) and the registry live in common.js.

let city, weather;

const TINTS = ['#bff4ff', '#38e8ff', '#ff4fd8', '#ffbe55', '#38e8ff', '#bff4ff'];
const NEON = ['#22eaff', '#ff2a9a', '#9d5cff', '#7dff5a'];
const BILLS = ['invader', 'bars', 'ticker', 'radar'];

function genCity(seed) {
  let r = rng(seed * 9973 + 1);
  const pick = a => a[Math.floor(r() * a.length)];
  const HZ = 0.8, RAIL = 0.6;

  // Density: below 1 each building is kept with that probability (the rest leave gaps, and
  // the survivors don't move); above 1 buildings get narrower and pack closer together.
  const D = cfg.density, keep = () => r() < D, wS = D > 1 ? 1 / Math.sqrt(D) : 1, gS = D > 1 ? 1 / D : 1;
  const far = [];
  for (let x = 0, id = 0; x < 1;) {
    const kept = keep(), w = (0.035 + r() * 0.06) * wS, b = { x, w, h: 0.22 + r() * 0.38, tiers: 1 + Math.floor(r() * 3), ant: r() < 0.5, id: ++id };
    if (kept) far.push(b);
    x += w + r() * 0.015 * gS;
  }

  const mid = [];
  for (let x = 0, id = 0; x < 1;) {
    const kept = keep(), w = (0.045 + r() * 0.07) * wS;
    const b = ({
      x, w, h: 0.22 + r() * 0.4, id: ++id,
      type: pick(['slab', 'setback', 'spire', 'dome', 'slab', 'setback']),
      win: pick(['grid', 'bands', 'strips', 'grid', 'sparse']),
      tint: pick(TINTS), accent: pick(TINTS),
      trim: r() < 0.5 ? pick(NEON) : null, trimRight: r() < 0.5, ant: r() < 0.5,
    });
    if (kept) mid.push(b);
    x += w + (0.006 + r() * 0.022) * gS;
  }
  // Holo billboards go on the widest towers, blade signs on the next few.
  const byWidth = mid.slice().sort((a, b) => b.w - a.w);
  const first = Math.floor(r() * 4);
  byWidth.slice(0, 3).forEach((b, i) => (b.bill = { kind: BILLS[(first + i) % 4], color: pick(NEON), fy: 0.08 + r() * 0.18 }));
  byWidth.slice(3, 6).forEach(b => (b.blade = { color: pick(NEON), fy: 0.08 + r() * 0.25 }));

  const near = [];
  for (let x = 0, id = 0; x < 1;) {
    const kept = keep(), w = (0.05 + r() * 0.1) * wS;
    const b = {
      x, w, h: 0.05 + r() * 0.1, id: ++id, boxes: Math.floor(r() * 3), ant: r() < 0.4,
      sign: r() < 0.6 ? { color: pick(NEON), flick: r() < 0.4 } : null,
    };
    if (kept) near.push(b);
    x += w + r() * 0.01 * gS;
  }

  // Everything after the buildings (sky, planet, traffic, billboard art) gets its own random
  // sequence, so it stays put when Density changes how many buildings there are.
  r = rng(seed * 9973 + 2);

  // A pixel "invader": random mirrored 5x5 sprite with eyes, plus a second frame for the legs.
  const half = () => { const a = [r() < 0.5, r() < 0.6, true]; return [a[0], a[1], a[2], a[1], a[0]]; };
  const top = half(), legs = half(), legs2 = half();
  const inv = [
    [top, [true, false, true, false, true], [true, true, true, true, true], half(), legs],
    null,
  ];
  inv[1] = [inv[0][0], inv[0][1], inv[0][2], inv[0][3], legs2];

  const lanes = [
    { y: 0.15, k: 1, dir: 1, s: 0.8, back: true },
    { y: 0.25, k: 2, dir: -1, s: 1.0, back: true },
    { y: 0.4, k: 1, dir: 1, s: 1.4 },
    { y: 0.5, k: 2, dir: -1, s: 1.8 },
  ].map(l => ({ ...l, cars: upTo(2, () => ({ o: r(), glow: pick(NEON) })) }));

  const beams = [0, 1, 2].map(i => ({ x: 0.12 + i * 0.36 + r() * 0.08, ph: r(), amp: 0.25 + r() * 0.2, color: pick(['#9fdcff', '#ff9ae6', '#c8b8ff']) }));
  const stars = Array.from({ length: 70 }, () => ({ x: r(), y: r() * 0.42, b: 0.3 + r() * 0.7 }));
  const planet = { x: 0.15 + r() * 0.7, y: 0.17 + r() * 0.05, r: 0.12 + r() * 0.04, tilt: -0.35 + r() * 0.2 };

  const bolt = [];
  let bx = 0.25 + r() * 0.5, by = 0;
  bolt.push([bx, by]);
  while (by < 0.3) { by += 0.02 + r() * 0.035; bx += (r() - 0.5) * 0.06; bolt.push([bx, by]); }

  return { HZ, RAIL, far, mid, near, inv, lanes, beams, stars, planet, bolt };
}

function genWeather(seed, loop) {
  const r = rng(seed * 31 + 7), HZ = city.HZ;
  const rain = [];
  for (let i = 0, n = Math.round(220 * cfg.density); i < n; i++) rain.push({ x0: r(), y0: r(), k: Math.max(1, Math.round(loop * (1.2 + r() * 0.7))), len: 26 + r() * 44, a: 0.12 + r() * 0.28 });
  const splash = [];
  for (let i = 0, n = Math.round(40 * cfg.density); i < n; i++) splash.push({ x: r(), y: HZ + 0.02 + r() * (0.97 - HZ - 0.02), m: Math.max(1, Math.round(loop * (0.35 + r() * 0.45))), o: r() });
  return { rain, splash };
}

// Lightning: [start, length, strength] in loop phase.
const FLASHES = [[0.58, 0.012, 0.8], [0.6, 0.008, 0.45], [0.615, 0.016, 0.65]];
function flash(u) {
  let f = 0;
  for (const [s, l, a] of FLASHES) if (u >= s && u < s + l) f = Math.max(f, a * (1 - ((u - s) / l) * 0.6));
  return f;
}

function hoverCar(g, x, y, s, dir, glowColor) {
  g.globalCompositeOperation = 'lighter';
  const tail = g.createLinearGradient(x - dir * 20 * s, 0, x - dir * 180 * s, 0);
  tail.addColorStop(0, glowColor); tail.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.55; g.fillStyle = tail;
  g.fillRect(Math.min(x - dir * 20 * s, x - dir * 180 * s), y + 1 * s, 160 * s, 3 * s);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#1c1c30';
  g.beginPath(); g.roundRect(x - 22 * s, y - 5 * s, 44 * s, 10 * s, 4 * s); g.fill();
  g.fillStyle = '#3a4a7a';
  g.beginPath(); g.roundRect(x - 8 * s + dir * 4 * s, y - 9 * s, 16 * s, 5 * s, 2 * s); g.fill();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = glowColor; g.fillRect(x - 18 * s, y + 5 * s, 36 * s, 2 * s);
  glow(g, x + dir * 22 * s, y, 18 * s, '#e8fbff', 1);
  glow(g, x - dir * 22 * s, y, 10 * s, '#ff2a40', 1);
  g.globalCompositeOperation = 'source-over';
}

// Animated billboard content, drawn inside the panel at (X, Y, w, h) in output pixels.
function drawBill(g, b, X, Y, w, h, u) {
  const { kind, color } = b.bill;
  g.fillStyle = '#070720'; g.fillRect(X, Y, w, h);
  g.fillStyle = color; g.strokeStyle = color;
  if (kind === 'invader') {
    const frame = Math.floor(u * cfg.loop * 2) % 2, rowsBits = city.inv[frame];
    const p = Math.max(2, Math.floor(Math.min(w / 8, h / 6.5)));
    const ox = X + (w - 5 * p) / 2 + Math.round(Math.sin(u * TAU * 2) * p), oy = Y + (h - 5 * p) / 2;
    rowsBits.forEach((row, j) => row.forEach((on, i) => on && g.fillRect(ox + i * p, oy + j * p, p, p)));
  } else if (kind === 'bars') {
    const n = 6, bw = w / n;
    for (let i = 0; i < n; i++) {
      const lv = 0.2 + 0.8 * Math.abs(Math.sin(u * TAU * (2 + (i % 3)) + i * 1.3));
      g.fillStyle = i % 2 ? color : '#ffffff';
      g.fillRect(X + i * bw + bw * 0.18, Y + h * (1 - lv * 0.86), bw * 0.64, h * lv * 0.86);
    }
  } else if (kind === 'ticker') {
    // Two lines of blocky "text" scrolling left; the pattern is 24 units long and moves 2 laps per loop.
    const unit = w / 10, L = 24, shift = Math.floor(u * L * 2);
    for (let line = 0; line < 2; line++) {
      for (let k = 0; k < 11; k++) {
        const idx = (k + shift + line * 7) % L;
        if (hash(b.id * 7 + line, idx) < 0.62) g.fillRect(X + k * unit + unit * 0.12, Y + h * (0.2 + line * 0.38), unit * 0.76, h * 0.24);
      }
    }
  } else if (kind === 'radar') {
    const cx = X + w / 2, cy = Y + h / 2, rad = Math.min(w, h) * 0.42, a = u * TAU * 2;
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx, cy, rad * 0.5, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); g.stroke();
    for (let i = 0; i < 4; i++) {
      const ba = hash(b.id, i) * TAU, br = (0.3 + 0.6 * hash(b.id, i + 9)) * rad;
      const d = (((a - ba) % TAU) + TAU) % TAU, lit = Math.max(0, 1 - d / 2);
      if (lit > 0) { g.globalAlpha = lit; g.fillRect(cx + Math.cos(ba) * br - 3, cy + Math.sin(ba) * br - 3, 6, 6); g.globalAlpha = 1; }
    }
  }
  g.lineWidth = 3; g.strokeStyle = color; g.strokeRect(X, Y, w, h);
}

function drawCity(u) {
  const g = sctx, W = GW, H = GH, C = city;
  const hzRow = Math.round(C.HZ * rows), HZ = hzRow * ch;
  const fl = flash(u), step = Math.floor(u * cfg.loop * 2);
  const cellY = y => Math.round(y * rows);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.lineCap = 'butt';

  // Sky, stars, planet.
  const sky = g.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, '#02030a'); sky.addColorStop(0.45, '#100b2c'); sky.addColorStop(0.8, '#4a1660'); sky.addColorStop(1, '#d0407a');
  g.fillStyle = sky; g.fillRect(0, 0, W, HZ);
  C.stars.forEach((s, i) => {
    if (hash(i, step) < 0.2) return;
    g.globalAlpha = s.b; g.fillStyle = '#d8e0ff'; g.fillRect(s.x * W, s.y * H, 3, 3);
  });
  g.globalAlpha = 1;
  const P = C.planet, px = P.x * W, py = P.y * H, pr = P.r * H;
  const ring = (a0, a1) => {
    g.strokeStyle = '#d6a0e0'; g.lineWidth = pr * 0.07; g.globalAlpha = 0.75;
    g.beginPath(); g.ellipse(px, py, pr * 2, pr * 0.42, P.tilt, a0, a1); g.stroke(); g.globalAlpha = 1;
  };
  ring(Math.PI, TAU);
  g.save();
  g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
  const bands = ['#3d1d64', '#5a2a78', '#7c3a80', '#a2508a', '#5a2a78', '#c26a8e'];
  for (let i = 0; i < 9; i++) { g.fillStyle = bands[i % bands.length]; g.fillRect(px - pr, py - pr + (i * 2 * pr) / 9, pr * 2, (2 * pr) / 9 + 1); }
  const shade = g.createLinearGradient(px - pr, 0, px + pr, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,10,.65)');
  g.fillStyle = shade; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  g.restore();
  ring(0, Math.PI);

  if (fl > 0.35) {
    for (const [lw, col, a] of [[14, '#b8c0ff', 0.35], [4, '#ffffff', 1]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = a; g.lineJoin = 'round';
      g.beginPath(); C.bolt.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H))); g.stroke();
    }
    g.globalAlpha = 1;
  }

  // Parallax: each layer repeats every P cells and scrolls a whole number of periods per loop.
  const farP = cfg.pan ? Math.max(8, Math.round(cols / 2)) : cols, midP = cols, nearP = cols;
  const farOff = cfg.pan ? Math.floor(u * farP) % farP : 0;
  const midOff = cfg.pan ? Math.floor(u * midP) % midP : 0;
  const nearOff = cfg.pan ? Math.floor(u * nearP * 2) % nearP : 0;

  // Megastructures: stepped towers with dim floor bands and beacons.
  for (const b of C.far) {
    const wC = Math.max(1, Math.round(b.w * farP)), r0 = cellY(C.HZ - b.h), rowsH = hzRow - r0;
    periodic(farP, farOff, Math.round(b.x * farP), wC, x0 => {
      for (let t = 0; t < b.tiers; t++) {
        const tw = wC - 2 * t;
        if (tw < 1) break;
        const top = r0 + Math.round((rowsH * 0.3 * (b.tiers - 1 - t)) / b.tiers);
        g.fillStyle = mixCss('#16122e', '#4a4a7c', fl * 0.6);
        g.fillRect((x0 + t) * cw, top * ch, tw * cw, HZ - top * ch);
        g.fillStyle = '#2e2660';
        for (let rr = top + 1; rr < hzRow; rr += 4) if (hash(b.id * 31 + t, rr) > 0.55) g.fillRect((x0 + t) * cw, rr * ch + ch * 0.35, tw * cw, ch * 0.3);
      }
      if (b.ant) {
        const ax = (x0 + wC / 2) * cw;
        g.fillStyle = '#2e2a55'; g.fillRect(ax - 1.5, r0 * ch - 0.05 * H, 3, 0.05 * H);
        if ((u * cfg.loop + b.x * 5) % 1 < 0.25) glow(g, ax, r0 * ch - 0.05 * H, 12, '#ff3040', 1);
      }
    });
  }

  // Searchlights sweep from behind the towers.
  g.globalCompositeOperation = 'lighter';
  for (const L of C.beams) {
    const a = -Math.PI / 2 + L.amp * Math.sin(u * TAU + L.ph * TAU), bx = L.x * W, len = H * 1.1;
    const grad = g.createLinearGradient(bx, HZ, bx + Math.cos(a) * len, HZ + Math.sin(a) * len);
    grad.addColorStop(0, L.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.16; g.fillStyle = grad;
    g.beginPath(); g.moveTo(bx, HZ);
    g.lineTo(bx + Math.cos(a - 0.05) * len, HZ + Math.sin(a - 0.05) * len);
    g.lineTo(bx + Math.cos(a + 0.05) * len, HZ + Math.sin(a + 0.05) * len); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  const traffic = back => {
    for (const l of C.lanes) {
      if (!!l.back !== back) continue;
      for (const car of l.cars) {
        const p = (car.o + u * l.k) % 1, x = (l.dir > 0 ? -0.25 + p * 1.5 : 1.25 - p * 1.5) * W;
        hoverCar(g, x, l.y * H + Math.sin(u * TAU * l.k * 2 + car.o * TAU) * 4, l.s, l.dir, car.glow);
      }
    }
  };
  traffic(true);

  // Towers.
  for (const b of C.mid) {
    const wC = Math.max(2, Math.round(b.w * midP)), r0 = cellY(C.HZ - b.h);
    periodic(midP, midOff, Math.round(b.x * midP), wC, x0 => drawTower(g, b, x0, wC, r0, hzRow, u, step));
  }

  traffic(false);

  // Monorail: neon-lit track on pillars, with a train passing once per loop.
  const T = cellY(C.RAIL) * ch;
  g.fillStyle = '#101022';
  for (let k = 0; k < 4; k++) periodic(midP, midOff, Math.round((k * midP) / 4) + 2, 1, x0 => g.fillRect(x0 * cw, T, cw, HZ - T));
  const tx = (-0.7 + ((u + 0.3) % 1) * 2.4) * W, tl = 0.55 * W, th = 0.032 * H;
  g.fillStyle = '#1d2038'; g.beginPath(); g.roundRect(tx, T - th, tl, th, th / 2); g.fill();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#bff4ff';
  for (let wx = tx + 30; wx < tx + tl - 40; wx += 34) g.fillRect(wx, T - th * 0.72, 20, th * 0.38);
  glow(g, tx + tl, T - th / 2, 40, '#e8fbff', 1);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#15152a'; g.fillRect(0, T, W, 0.014 * H);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#22eaff'; g.globalAlpha = 0.8;
  g.fillRect(0, T - 1, W, 3);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  // Low-rise rooftops in the foreground.
  for (const b of C.near) {
    const wC = Math.max(2, Math.round(b.w * nearP)), r0 = cellY(C.HZ - b.h);
    periodic(nearP, nearOff, Math.round(b.x * nearP), wC, x0 => drawLowrise(g, b, x0, wC, r0, hzRow, u, step));
  }

  // Wet street: mirror everything above the horizon row by row with a rippling offset.
  g.fillStyle = '#05050b'; g.fillRect(0, HZ, W, H - HZ);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const hz = hzRow * MODES[cfg.mode].sy, n = SH - hz;
  for (let d = 0; d < n; d++) {
    const src = hz - 1 - Math.floor(d * 1.25);
    if (src < 0) break;
    const t = d / n;
    g.globalAlpha = 0.6 * (1 - t) * (1 - t) + 0.06;
    g.drawImage(sc, 0, src, SW, 1, Math.sin(d * 1.7 + u * TAU * 4) * (0.6 + t * 2.5) * (SW / 320), hz + d, SW, 1);
  }
  g.globalAlpha = 1;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.fillStyle = '#2a2850'; g.fillRect(0, HZ, W, 3);

  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = '#a8b8ff'; g.lineWidth = clamp(cw * 0.25, 2, 4); g.lineCap = 'round';
  const slant = -0.2, span = W + 200;
  for (const d of weather.rain) {
    const y = ((d.y0 + d.k * u) % 1) * (H + d.len * 2) - d.len;
    const x = ((((d.x0 * span + y * slant) % span) + span) % span) - 100;
    g.globalAlpha = d.a;
    g.beginPath(); g.moveTo(x - slant * d.len, y - d.len); g.lineTo(x, y); g.stroke();
  }
  g.strokeStyle = '#b8c8ff'; g.lineWidth = 2;
  for (const s of weather.splash) {
    const p = (u * s.m + s.o) % 1;
    if (p > 0.22) continue;
    const q = p / 0.22, persp = (s.y - C.HZ) / (1 - C.HZ), size = (6 + 30 * persp) * (0.3 + q);
    g.globalAlpha = (1 - q) * 0.8;
    g.beginPath(); g.ellipse(s.x * W, s.y * H, size, size * 0.3, 0, 0, TAU); g.stroke();
  }
  if (fl > 0) { g.globalAlpha = fl * 0.2; g.fillStyle = '#b0b8ff'; g.fillRect(0, 0, W, H); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt';
}

function drawTower(g, b, x0, wC, r0, hzRow, u, step) {
  const H = GH, X = x0 * cw, Y = r0 * ch, Wd = wC * cw, HZ = hzRow * ch;
  g.fillStyle = '#0b0b1c';
  let roof = Y;
  if (b.type === 'setback' && wC >= 4) {
    const k = Math.max(1, Math.round((hzRow - r0) * 0.3));
    g.fillRect(X + cw, Y, Wd - 2 * cw, k * ch);
    g.fillRect(X, Y + k * ch, Wd, HZ - Y - k * ch);
  } else {
    g.fillRect(X, Y, Wd, HZ - Y);
  }
  if (b.type === 'spire') {
    g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Wd, Y); g.lineTo(X + Wd / 2, Y - 0.08 * H); g.fill();
    roof = Y - 0.08 * H;
  } else if (b.type === 'dome') {
    g.beginPath(); g.ellipse(X + Wd / 2, Y, Wd / 2, 0.035 * H, 0, Math.PI, TAU); g.fill();
    roof = Y - 0.035 * H;
  }
  if (b.ant || b.type === 'spire') {
    const ax = X + Wd / 2;
    g.fillStyle = '#34345a'; g.fillRect(ax - 1.5, roof - 0.05 * H, 3, 0.05 * H);
    if ((u * cfg.loop + b.x * 3) % 1 < 0.2) glow(g, ax, roof - 0.05 * H, 14, b.type === 'spire' ? '#ffffff' : '#ff2a2a', 1);
  }

  // Billboard area in cells, so windows can skip it.
  let bill = null;
  if (b.bill) {
    const bw = clamp(Math.round((0.075 * GW) / cw), 4, wC - 2), bh = clamp(Math.round((0.12 * H) / ch), 3, Math.max(3, hzRow - r0 - 3));
    bill = { c: x0 + Math.floor((wC - bw) / 2), r: r0 + Math.max(1, Math.round((hzRow - r0) * b.bill.fy)), w: bw, h: bh };
  }

  for (let rr = 1; r0 + rr < hzRow - 1; rr++) for (let cc = 1; cc < wC - 1; cc++) {
    const r = r0 + rr, c = x0 + cc;
    if (bill && c >= bill.c && c < bill.c + bill.w && r >= bill.r && r < bill.r + bill.h) continue;
    if (b.type === 'setback' && wC >= 4 && rr < Math.round((hzRow - r0) * 0.3) && (cc < 2 || cc >= wC - 2)) continue;
    const id = (cfg.seed * 7919 + b.id * 4096 + rr * 64 + cc) | 0, h = hash(id, 1);
    let slot = false, on = false;
    if (b.win === 'grid') { slot = rr % 2 === 1 && cc % 2 === 1; on = h < 0.5; }
    else if (b.win === 'bands') { slot = rr % 3 === 1; on = hash(b.id, rr) < 0.75 && h > 0.08; }
    else if (b.win === 'strips') { slot = cc % 3 === 1; on = hash(b.id * 13 + cc, Math.floor(rr / 3)) < 0.55; }
    else { slot = rr % 2 === 1; on = h < 0.2; }
    if (!slot) continue;
    if (hash(id, 2) < 0.06 && hash(id, 100 + step) < 0.15) on = !on;
    g.fillStyle = on ? (hash(id, 3) < 0.15 ? b.accent : b.tint) : '#120f26';
    g.fillRect(c * cw, r * ch, cw, ch);
  }

  if (b.trim) {
    g.globalCompositeOperation = 'lighter'; g.fillStyle = b.trim;
    g.fillRect(b.trimRight ? X + Wd - 3 : X, Y, 3, HZ - Y);
    g.fillRect(X, Y, Wd, 3);
    g.globalCompositeOperation = 'source-over';
  }
  if (bill) drawBill(g, b, bill.c * cw, bill.r * ch, bill.w * cw, bill.h * ch, u);
  if (b.blade) {
    // A vertical sign hanging off the right edge, with a slow scrolling light pattern.
    const n = Math.max(3, Math.round((0.16 * H) / ch)), r1 = r0 + Math.max(1, Math.round((hzRow - r0) * b.blade.fy));
    const shift = Math.floor(u * n * 2);
    g.fillStyle = '#070720'; g.fillRect((x0 + wC) * cw, r1 * ch, cw, n * ch);
    g.fillStyle = b.blade.color;
    for (let j = 0; j < n; j++) if (hash(b.id, (j + shift) % n) > 0.4) g.fillRect((x0 + wC) * cw + cw * 0.2, (r1 + j) * ch + ch * 0.15, cw * 0.6, ch * 0.7);
    g.strokeStyle = b.blade.color; g.lineWidth = 2; g.strokeRect((x0 + wC) * cw, r1 * ch, cw, n * ch);
  }
}

function drawLowrise(g, b, x0, wC, r0, hzRow, u, step) {
  const H = GH, X = x0 * cw, Y = r0 * ch, Wd = wC * cw, HZ = hzRow * ch;
  g.fillStyle = '#07070f'; g.fillRect(X, Y, Wd, HZ - Y);
  g.fillStyle = '#1e1e38'; g.fillRect(X, Y, Wd, 3);
  g.fillStyle = '#14142a';
  for (let i = 0; i < b.boxes; i++) g.fillRect(X + cw * (1 + i * 2.5), Y - 0.018 * H, cw * 1.4, 0.018 * H);
  if (b.ant) { g.fillStyle = '#2a2a44'; g.fillRect(X + Wd * 0.8, Y - 0.045 * H, 2, 0.045 * H); }
  // Shopfront strip along the bottom row.
  for (let c = 1; c < wC - 1; c++) {
    if (hash(b.id * 17, c) < 0.25) { g.fillStyle = hash(b.id, c) < 0.5 ? '#8a5a24' : '#1d6f80'; g.fillRect((x0 + c) * cw, (hzRow - 1) * ch + ch * 0.3, cw, ch * 0.7); }
  }
  if (b.sign && wC >= 4 && hzRow - r0 >= 4) {
    const s = b.sign, on = !(s.flick && hash(b.id, step) < 0.15);
    const sx = x0 + 1, sw = wC - 2, sy = r0 + 1;
    g.fillStyle = '#05051a'; g.fillRect(sx * cw, sy * ch, sw * cw, ch * 1.6);
    g.globalAlpha = on ? 1 : 0.15; g.fillStyle = s.color;
    for (let c = 0; c < sw; c++) if (hash(b.id * 5, c) < 0.7) g.fillRect((sx + c) * cw + cw * 0.15, sy * ch + ch * 0.3, cw * 0.7, ch);
    g.strokeStyle = s.color; g.lineWidth = 2; g.strokeRect(sx * cw, sy * ch, sw * cw, ch * 1.6);
    g.globalAlpha = 1;
  }
}

SCENES.city = {
  label: 'Neon City',
  gen(seed, loop) { city = genCity(seed); weather = genWeather(seed, loop); },
  draw: drawCity,
};
