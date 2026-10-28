'use strict';
// School Dance (side view): a vintage prom in the school gym. A big mirror ball hangs top
// middle and throws a field of light spots that sweep across the walls, floor and dancers as
// it turns, with soft beams through the haze. Couples dance in three rows under crepe-paper
// streamers and balloon clusters, in front of a curtained stage with a starry backdrop; two
// coloured pin spots circle the varnished floor. Couples turn in 3D about the point between
// them: some slow-dance (swaying, turning once per loop, holding close), others spin two or
// three times per loop in an arms-out hold with skirts flaring. Silhouettes are 50s/60s prom
// looks (bouffants, flips, pompadours; gowns and tea-length dresses, tuxes and dinner jackets).
// Everything moves in whole cycles per loop: the ball turns a whole number of times, couples
// turn and sway whole numbers of times. Parallax drifts the rows of dancers
// around the floor (back row one way, front rows the other), 1 to 3 screen widths per loop.

let prom;

function genProm(seed, loop) {
  let r = rng(seed * 7151 + 33);
  const W = GW, H = GH, k = W / 1920;
  const pick = a => a[Math.floor(r() * a.length)];
  const FLOOR = 0.6 * H;  // where the back wall meets the floor
  const DRESS = ['#f2a7c3', '#a8e6cf', '#c3aef0', '#9cc9f5', '#f7e08a', '#f5b38a', '#f0f0f4', '#e86a8a'];
  const SUIT = ['#1a1626', '#232038', '#3a1a2a', '#ece6da', '#1c2a3a', '#5a3a6a'];
  const TIE = ['#e8508a', '#3a8ae8', '#e8c040', '#c03030', '#101010'];
  const SKIN = ['#e8b896', '#c88a64', '#8a5a3c', '#f0c8a8', '#6a4030'];
  const HAIR = ['#2a1a10', '#5a3a1a', '#d8b060', '#141010', '#8a4a2a', '#b0b0b8'];
  const sways = Math.max(1, Math.round(loop / 2));  // one step side to side about every 2 s

  // One dancer's look, with colours pre-darkened for their row (back rows sit in the gloom).
  const dancer = dim => {
    const d = col => mixCss(col, '#06040c', dim);
    const dress = r() < 0.55, col = dress ? pick(DRESS) : pick(SUIT), style = r(), tea = r() < 0.5;
    return {
      dress, tea, color: d(col), shade: d(mixCss(col, '#000000', 0.3)), trousers: d(pick(['#141220', '#1a1a2a', '#2a2030'])),
      tie: d(pick(TIE)), shirt: d('#f4f0e8'), skin: d(pick(SKIN)), hair: d(pick(HAIR)), shoe: d(pick(['#101010', '#2a1a10', '#e8e0d8'])),
      hairdo: dress ? ['bouffant', 'flip', 'long', 'updo'][Math.floor(style * 4)] : style < 0.5 ? 'pomp' : 'short', h: 0.93 + r() * 0.12,
    };
  };
  // Rows of couples, back to front. Positions follow the golden-ratio sequence, so any number
  // of couples (Density) is evenly spread and adding more keeps the ones already there.
  const ROWS = [{ y: 0.7, s: 0.62, dim: 0.5, base: 4, laps: -1 }, { y: 0.82, s: 0.86, dim: 0.35, base: 3, laps: 2 }, { y: 0.99, s: 1.18, dim: 0.2, base: 3, laps: 3 }];
  const rows = ROWS.map(row => {
    const off = r();
    const couples = upTo(row.base, (_, i) => {
      const a = dancer(row.dim), b = dancer(row.dim), spin = r() < 0.5, dir = r() < 0.5 ? 1 : -1;
      return { xn: (off + i * 0.6180339887) % 1, a, b, th: r() * TAU, spin, turns: dir * (spin ? 2 + Math.floor(r() * 2) : 1), sw: r(), swA: 0.6 + r() * 0.7 };
    });
    return { ...row, couples };
  });

  // Mirror-ball spots: directions on the ball (azimuth, and a screen height they land at).
  const spots = upTo(280, () => {
    const y = (0.02 + r() * 0.98) * H;
    return { ph: r() * TAU, y, sz: (4.5 + r() * 6) * (y > FLOOR ? 1.6 : 1), tint: r() < 0.25 ? pick(['#ffb0e0', '#a0f0ff', '#ffe0a0']) : '#ffffff' };
  });
  const confetti = upTo(36, () => ({ x: r(), y: r(), laps: 1 + Math.floor(r() * 2), w: 1 + Math.floor(r() * 3), ph: r(), spin: 2 + Math.floor(r() * 6), color: pick(DRESS) }));

  // Everything below gets its own random sequence, so it stays put when Density changes.
  r = rng(seed * 7151 + 34);
  const beams = Array.from({ length: 9 }, () => ({ ph: r() * TAU, y: (0.45 + r() * 0.55) * H }));
  const pins = [{ c: '#ff6ac8', ph: r(), corner: 0 }, { c: '#6ad8ff', ph: r(), corner: 1 }];
  const ball = { x: W / 2, y: 0.19 * H, R: 0.085 * H, turns: Math.max(1, Math.round(loop / 8)), tilt: 0.25 };
  const steps = Math.max(1, Math.round(loop * 8));  // sparkle changes 8 times a second

  const room = paintLayer(g => {
    // Back wall with tall gym panels and high windows.
    const wall = g.createLinearGradient(0, 0, 0, FLOOR);
    wall.addColorStop(0, '#0a0614'); wall.addColorStop(0.55, '#1c0f2e'); wall.addColorStop(1, '#2c1838');
    g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR + 1);
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.04;
    for (let x = 0; x < W; x += 110 * k) g.fillRect(x, 0.14 * H, 3 * k, FLOOR - 0.14 * H);
    g.globalAlpha = 1;
    for (let i = 0; i < 10; i++) {
      const x = ((i + 0.5) / 10) * W;
      if (Math.abs(x - W / 2) < 0.12 * W) continue;
      g.fillStyle = '#121838'; g.fillRect(x - 46 * k, 0.05 * H, 92 * k, 0.06 * H);
      g.fillStyle = '#06040c'; g.fillRect(x - 2 * k, 0.05 * H, 4 * k, 0.06 * H); g.fillRect(x - 46 * k, 0.08 * H - k, 92 * k, 2 * k);
    }

    // Stage: a starry backdrop between red velvet curtains, under a scalloped valance.
    const s0 = 0.27 * W, s1 = 0.73 * W, top = 0.3 * H, deck = FLOOR - 0.05 * H;
    const back = g.createLinearGradient(0, top, 0, deck);
    back.addColorStop(0, '#0a1040'); back.addColorStop(1, '#2a2a7a');
    g.fillStyle = back; g.fillRect(s0, top, s1 - s0, deck - top);
    g.fillStyle = '#fff4c8';
    for (let i = 0; i < 70; i++) { const x = s0 + r() * (s1 - s0), y = top + r() * (deck - top) * 0.8, s = (1 + r() * 2.5) * k; g.globalAlpha = 0.4 + r() * 0.6; g.fillRect(x - s / 2, y - s / 2, s, s); }
    g.globalAlpha = 1;
    // A paper crescent moon on the backdrop.
    g.fillStyle = '#f4e6a0'; g.beginPath(); g.arc(0.62 * W, top + 0.07 * H, 0.035 * H, 0, TAU); g.fill();
    g.fillStyle = '#121a52'; g.beginPath(); g.arc(0.62 * W + 0.014 * H, top + 0.062 * H, 0.032 * H, 0, TAU); g.fill();
    for (const [x0, x1] of [[s0 - 0.02 * W, s0 + 0.07 * W], [s1 - 0.07 * W, s1 + 0.02 * W]]) {
      for (let x = x0, i = 0; x < x1; x += 14 * k, i++) { g.fillStyle = i % 2 ? '#6a0a1e' : '#8a1428'; g.fillRect(x, top - 0.02 * H, 14 * k, deck - top + 0.02 * H); }
    }
    g.fillStyle = '#8a1428'; g.fillRect(s0 - 0.02 * W, top - 0.06 * H, s1 - s0 + 0.04 * W, 0.04 * H);
    g.beginPath();
    for (let x = s0 - 0.02 * W; x < s1 + 0.02 * W; x += 0.04 * W) { g.moveTo(x, top - 0.02 * H); g.arc(x + 0.02 * W, top - 0.02 * H, 0.02 * W, 0, Math.PI); }
    g.fill();
    g.fillStyle = '#d8a840'; g.fillRect(s0 - 0.02 * W, top - 0.062 * H, s1 - s0 + 0.04 * W, 3 * k);
    g.fillStyle = '#1a0e14'; g.fillRect(s0 - 0.03 * W, deck, s1 - s0 + 0.06 * W, FLOOR - deck);
    g.fillStyle = '#3a2430'; g.fillRect(s0 - 0.03 * W, deck, s1 - s0 + 0.06 * W, 3 * k);

    // Crepe-paper streamers swagged across the ceiling, with twisted drops between swags.
    const SW_COL = ['#f2a7c3', '#a8e6cf', '#f7e08a', '#c3aef0'];
    g.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      const n = 5 + layer * 2, y0 = (0.02 + layer * 0.045) * H, sag = (0.05 + layer * 0.015) * H;
      g.strokeStyle = SW_COL[layer]; g.lineWidth = (5 - layer) * k; g.globalAlpha = 0.85 - layer * 0.15;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const xa = (i / n) * W, xb = ((i + 1) / n) * W;
        g.moveTo(xa, y0); g.quadraticCurveTo((xa + xb) / 2, y0 + sag * 2, xb, y0);
      }
      g.stroke();
      g.lineWidth = 3 * k;
      for (let i = 1; i < n; i++) {
        const x = (i / n) * W, len = (0.06 + r() * 0.08) * H;
        g.beginPath(); g.moveTo(x, y0);
        for (let t = 0; t <= 1.0001; t += 0.1) g.lineTo(x + Math.sin(t * 9 + i) * 5 * k, y0 + t * len);
        g.stroke();
      }
    }
    g.globalAlpha = 1;

    // Balloon clusters at both ends of the stage and on the side walls.
    for (const bx of [s0 - 0.05 * W, s1 + 0.05 * W, 0.06 * W, 0.94 * W]) {
      const by = FLOOR - 0.2 * H;
      for (let i = 0; i < 7; i++) {
        const x = bx + (r() - 0.5) * 0.06 * W, y = by + (r() - 0.5) * 0.09 * H, rr = (22 + r() * 10) * k, col = pick(DRESS);
        g.strokeStyle = '#c8b8c8'; g.lineWidth = 1.2 * k; g.globalAlpha = 0.6;
        g.beginPath(); g.moveTo(x, y + rr); g.lineTo(bx, FLOOR); g.stroke(); g.globalAlpha = 1;
        g.fillStyle = mixCss(col, '#1a1020', 0.35); g.beginPath(); g.ellipse(x, y, rr * 0.9, rr, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(x - rr * 0.12, y - rr * 0.12, rr * 0.7, rr * 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x - rr * 0.35, y - rr * 0.4, rr * 0.16, rr * 0.24, -0.5, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
    }

    // Varnished floor: boards running away to a vanishing point, a painted court circle, and
    // a sheen of light under the ball.
    const fl = g.createLinearGradient(0, FLOOR, 0, H);
    fl.addColorStop(0, '#3a2014'); fl.addColorStop(1, '#7a4a26');
    g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
    const vy = FLOOR - 0.5 * H, t = (FLOOR - vy) / (H - vy);
    g.strokeStyle = '#1a0c06'; g.lineWidth = 1.5 * k; g.globalAlpha = 0.45;
    for (let i = -60; i <= 60; i++) { const xb = W / 2 + (i * W) / 22; g.beginPath(); g.moveTo(W / 2 + (xb - W / 2) * t, FLOOR); g.lineTo(xb, H); g.stroke(); }
    g.globalAlpha = 0.2;
    for (let j = 1; j < 16; j++) { const y = FLOOR + (H - FLOOR) * (j / 16) ** 1.7; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#e0c070'; g.globalAlpha = 0.3; g.lineWidth = 4 * k;
    g.beginPath(); g.ellipse(W / 2, FLOOR + 0.2 * H, 0.24 * W, 0.07 * H, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(W / 2, FLOOR + 0.02 * H); g.lineTo(W / 2, H); g.stroke();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    g.save(); g.translate(W / 2, FLOOR + 0.16 * H); g.scale(1, 0.3);
    glow(g, 0, 0, 0.3 * W, '#c89060', 0.35);
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#0e080c'; g.fillRect(0, FLOOR - 3 * k, W, 6 * k);
  });

  prom = { rows, spots, confetti, beams, pins, ball, steps, sways, room, FLOOR, k };
}

// Draws a smooth closed outline through (dx, dy) points (fractions of the dancer's height,
// dx across, dy up from the floor), using each point as a curve control so the silhouette has
// no corners.
function promOutline(g, x, y, h, pts) {
  const P = pts.map(([dx, dy]) => [x + dx * h, y - dy * h]), n = P.length;
  const mid = i => [(P[i][0] + P[(i + 1) % n][0]) / 2, (P[i][1] + P[(i + 1) % n][1]) / 2];
  g.beginPath();
  let m = mid(n - 1); g.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { m = mid(i); g.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
  g.closePath(); g.fill();
}

// Body cross-sections as [half-width, height] from the neck down, in fractions of the
// dancer's height, after real proportions (about 7.5 heads tall).
const PROM_BODY = {
  dress: [[0.024, 0.865], [0.05, 0.846], [0.1, 0.832], [0.118, 0.806], [0.104, 0.77], [0.106, 0.733], [0.09, 0.695], [0.07, 0.63], [0.084, 0.575], [0.112, 0.535]],
  suit: [[0.03, 0.865], [0.075, 0.848], [0.128, 0.832], [0.134, 0.795], [0.122, 0.735], [0.106, 0.655], [0.1, 0.585], [0.108, 0.5], [0.108, 0.462]],
};
// Seen side-on, the chest pushes forward and the hips back, which gives a body its S-curve.
const promLean = dy => (dy > 0.68 && dy < 0.78 ? 0.035 : dy < 0.6 && dy > 0.45 ? -0.022 : 0);

// One dancer standing at (x, y), h tall, arms not included. ws (0.6..1) narrows the body as
// they turn side-on; face is the screen direction they look (-1 left, +1 right); front is
// true when they face the camera (face and shirt visible) rather than away; flare widens a
// skirt as it spins.
function promDancer(g, x, y, h, p, ws, face, front, flare) {
  const half = (rows, sgn) => rows.map(([w, dy]) => [sgn * w * ws + promLean(dy) * (1 - ws) * face * 1.6, dy]);
  const leg = (pts, sgn) => pts.map(([w, dy]) => [sgn * w * (0.55 + 0.45 * ws) + face * (1 - ws) * 0.02, dy]);
  if (p.dress) {
    const hem = p.tea ? 0.16 : 0.015, f = flare;
    if (p.tea) {
      // Calves and heels below a tea-length skirt.
      g.fillStyle = p.skin;
      for (const sg of [-1, 1]) promOutline(g, x, y, h, leg([[0.012, hem + 0.02], [0.046, hem + 0.02], [0.042, 0.1], [0.03, 0.035], [0.016, 0.03], [0.014, 0.1]], sg));
      g.fillStyle = p.shoe;
      for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(x + sg * h * 0.024 * ws + face * h * 0.012, y - h * 0.014, h * 0.034, h * 0.014, 0, 0, TAU); g.fill(); }
    }
    const R = PROM_BODY.dress.concat([[0.155 * f, 0.36], [0.215 * f, hem + 0.04]]);
    const pts = half(R, 1);
    const waves = Math.round(4 + f * 3);
    for (let i = 0; i <= waves; i++) { const t = i / waves; pts.push([0.22 * f * (1 - 2 * t) * ws, hem + (i % 2 ? 0.014 * f : -0.004)]); }
    pts.push(...half(R, -1).reverse());
    g.fillStyle = p.color; promOutline(g, x, y, h, pts);
    // A shaded fold down the skirt, and the shoulders and arms' skin above the bodice.
    g.fillStyle = p.shade;
    g.beginPath(); g.moveTo(x, y - h * 0.53); g.quadraticCurveTo(x - face * h * 0.05, y - h * 0.28, x - face * h * 0.12 * f * ws, y - h * hem); g.lineTo(x - face * h * 0.02, y - h * hem); g.closePath(); g.fill();
    g.fillStyle = p.skin;
    promOutline(g, x, y, h, half([[0.024, 0.865], [0.05, 0.846], [0.1, 0.832], [0.118, 0.806], [0.1, 0.79], [0.06, 0.8]], 1).concat(half([[0.06, 0.8], [0.1, 0.79], [0.118, 0.806], [0.1, 0.832], [0.05, 0.846], [0.024, 0.865]], -1)));
  } else {
    g.fillStyle = p.trousers;
    for (const sg of [-1, 1]) promOutline(g, x, y, h, leg([[0.004, 0.48], [0.066, 0.48], [0.056, 0.27], [0.046, 0.045], [0.016, 0.045], [0.012, 0.27]], sg));
    g.fillStyle = p.shoe;
    for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(x + sg * h * 0.03 * ws + face * h * 0.018, y - h * 0.016, h * 0.045, h * 0.018, 0, 0, TAU); g.fill(); }
    const R = PROM_BODY.suit;
    g.fillStyle = p.color; promOutline(g, x, y, h, half(R, 1).concat([[0, 0.455]], half(R, -1).reverse()));
    if (front && ws > 0.75) {
      g.fillStyle = p.shirt; g.beginPath(); g.moveTo(x - h * 0.034, y - h * 0.85); g.lineTo(x + h * 0.034, y - h * 0.85); g.lineTo(x, y - h * 0.66); g.closePath(); g.fill();
      g.fillStyle = p.tie; g.beginPath(); g.ellipse(x - h * 0.016, y - h * 0.838, h * 0.016, h * 0.01, 0, 0, TAU); g.ellipse(x + h * 0.016, y - h * 0.838, h * 0.016, h * 0.01, 0, 0, TAU); g.fill();
    }
  }
  // Neck, head (with a nose and chin in profile), then hair: over the whole head from behind.
  const hx = x + face * h * 0.025 * (1 - ws), hy = y - h * 0.935, hr = h * 0.056;
  g.fillStyle = p.skin;
  g.fillRect(x - h * 0.022, hy + hr * 0.7, h * 0.044, h * 0.05);
  g.beginPath(); g.ellipse(hx, hy, hr * (0.86 + 0.14 * ws), hr * 1.2, 0, 0, TAU); g.fill();
  if (ws < 0.85) { g.beginPath(); g.moveTo(hx + face * hr * 0.8, hy - hr * 0.25); g.lineTo(hx + face * hr * 1.12, hy + hr * 0.2); g.lineTo(hx + face * hr * 0.8, hy + hr * 0.35); g.fill(); }
  g.fillStyle = p.hair;
  const back = hx - face * hr * 0.6 * (1 - ws);
  if (!front) { g.beginPath(); g.ellipse(back, hy - hr * 0.08, hr * 1.02, hr * 1.22, 0, 0, TAU); g.fill(); }
  switch (p.hairdo) {
    case 'bouffant': g.beginPath(); g.ellipse(back, hy - hr * 0.55, hr * 1.28, hr * 0.98, 0, 0, TAU); g.fill(); break;
    case 'flip':
      g.beginPath(); g.ellipse(back, hy - hr * 0.4, hr * 1.14, hr * 0.88, 0, 0, TAU); g.fill();
      g.fillRect(back - hr * 1.12, hy - hr * 0.4, hr * 2.24, hr * 1.15);
      for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(back + sg * hr * 1.06, hy + hr * 0.78, hr * 0.44, hr * 0.27, sg * 0.6, 0, TAU); g.fill(); }
      break;
    case 'long':
      g.beginPath(); g.ellipse(back, hy - hr * 0.35, hr * 1.12, hr * 0.92, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(back - hr * 1.06, hy - hr * 0.2); g.quadraticCurveTo(back - hr * 1.4, hy + hr * 2.2, back - face * hr * 0.4, hy + hr * 2.7);
      g.quadraticCurveTo(back + hr * 1.4, hy + hr * 2.2, back + hr * 1.06, hy - hr * 0.2); g.fill();
      break;
    case 'updo':
      g.beginPath(); g.ellipse(back, hy - hr * 0.45, hr * 1.08, hr * 0.88, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(back - face * hr * 0.5, hy - hr * 1.28, hr * 0.56, 0, TAU); g.fill();
      break;
    case 'pomp':
      g.beginPath(); g.ellipse(back, hy - hr * 0.5, hr * 1.05, hr * 0.78, 0, Math.PI, TAU); g.fill();
      g.beginPath(); g.ellipse(hx + face * hr * 0.35, hy - hr * 1.05, hr * 0.78, hr * 0.46, -face * 0.25, 0, TAU); g.fill();
      break;
    default: g.beginPath(); g.ellipse(back, hy - hr * 0.45, hr * 1.06, hr * 0.82, 0, Math.PI, TAU); g.fill();
  }
}

// An arm from shoulder S to hand T (screen points with depth z), with the elbow bending out
// to the side `out` and down: a full upper arm, a tapering forearm, and a hand.
function promArm(g, S, T, out, h, sleeve, skin) {
  const ex = (S.x + T.x) / 2 + out * h * 0.05, ey = Math.max(S.y, T.y) + h * 0.06;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = sleeve; g.lineWidth = h * 0.054; g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(ex, ey); g.stroke();
  g.lineWidth = h * 0.042; g.beginPath(); g.moveTo(ex, ey); g.lineTo(T.x, T.y); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.ellipse(T.x, T.y, h * 0.024, h * 0.03, 0, 0, TAU); g.fill();
}

// A couple turning about the point between them. Everything is placed in 3D around that
// point (x across, z toward the camera) and drawn back to front: partners get a little bigger
// and lower on screen as they come round to the front, narrow to profile at the sides, and
// show their face or the back of their head. Arms are real limbs between real shoulders and
// hands, so hands rest on a partner's back, shoulders or waist and come round in front or
// behind as the couple turns. Slow dancers hold close and sway; spinners use an open hold,
// clasped hands out to the side, with skirts flaring.
function promCouple(g, x, y, h, c, u, sways) {
  const th = c.th + TAU * u * c.turns;
  const sway = Math.sin(TAU * (u * sways + c.sw)) * h * (c.spin ? 0.012 : 0.035) * c.swA;
  const d = h * (c.spin ? 0.085 : 0.05), cx = x + sway, flare = c.spin ? 1.4 : 1;
  g.fillStyle = '#050208'; g.globalAlpha = 0.45;
  g.beginPath(); g.ellipse(cx, y, h * (c.spin ? 0.32 : 0.28), h * 0.04, 0, 0, TAU); g.fill();
  g.globalAlpha = 1;
  const nx = -Math.sin(th), nz = Math.cos(th);  // across the couple, the same for both partners
  // Screen point for a spot `side` across and `fwd` toward the partner from dancer P, dy up.
  const pt = (P, side, fwd, dy) => {
    const wx = P.px + nx * side + P.tx * fwd, wz = P.pz + nz * side + P.tz * fwd;
    return { x: wx, z: wz / d, y: y - dy * P.hh + (wz / d) * h * 0.022 };
  };
  const mk = (p, ang) => {
    const P = { p, ang, px: cx + Math.cos(ang) * d, pz: Math.sin(ang) * d, tx: -Math.cos(ang), tz: -Math.sin(ang) };
    P.face = P.tx > 0 ? 1 : -1;
    P.front = P.tz > 0;
    P.ws = 0.6 + 0.4 * Math.abs(Math.sin(ang));
    P.hh = h * p.h * (1 + 0.05 * Math.sin(ang));
    P.z = Math.sin(ang);
    P.sleeve = p.dress ? p.skin : p.color;
    return P;
  };
  const A = mk(c.a, th), B = mk(c.b, th + Math.PI);
  // The follower (in a dress, if either partner is) puts their arms up; the leader's go down.
  const [F, Ld] = !A.p.dress && B.p.dress ? [B, A] : [A, B];
  const sF = F === A ? 1 : -1;  // F's +1 side meets the leader's -1 side
  const sw = h * 0.11, items = [];
  const body = P => ({ z: P.z, draw: () => promDancer(g, P.px, y + P.z * h * 0.022, P.hh, P.p, P.ws, P.face, P.front, flare) });
  items.push(body(A), body(B));
  const arm = (P, S, T, out) => items.push({ z: (S.z + T.z) / 2 + 0.05, draw: () => promArm(g, S, T, out, P.hh, P.sleeve, P.p.skin) });
  if (!c.spin) {
    for (const s of [1, -1]) {
      arm(F, pt(F, s * sF * sw, 0, 0.81), pt(Ld, -s * sF * sw * 0.6 * -1, -0.02 * h, 0.83), s * sF * nx);
      arm(Ld, pt(Ld, -s * sF * sw * -1, 0, 0.8), pt(F, s * sF * sw * 0.7, -0.03 * h, 0.6), s * sF * nx);
    }
  } else {
    // Clasped hands out to one side, raised; the leader's other hand on the follower's back,
    // the follower's other hand on the leader's shoulder.
    const hand = { x: cx + nx * d * 1.9, z: (nz * d * 1.9) / d, y: y - 0.86 * h + nz * 1.9 * h * 0.022 };
    arm(F, pt(F, sF * sw, 0, 0.81), hand, nx);
    arm(Ld, pt(Ld, sF * sw, 0, 0.81), hand, nx);
    arm(Ld, pt(Ld, -sF * sw, 0, 0.8), pt(F, -sF * sw * 0.4, -0.05 * h, 0.72), -nx);
    arm(F, pt(F, -sF * sw, 0, 0.81), pt(Ld, -sF * sw * 0.8, 0, 0.82), -nx);
  }
  items.sort((p, q) => p.z - q.z);
  for (const it of items) it.draw();
}

function drawProm(u) {
  const g = sctx, P = prom, W = GW, H = GH, k = P.k, B = P.ball;
  const rot = TAU * u * B.turns, step = Math.floor(u * P.steps) % P.steps;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, P.room);

  // Haze beams from the ball, turning with it.
  g.globalCompositeOperation = 'lighter';
  for (const b of P.beams) {
    const ph = b.ph + rot, c = Math.cos(ph);
    if (c < 0.15) continue;
    const x = W / 2 + Math.sin(ph) * W * 0.62, len = Math.hypot(x - B.x, b.y - B.y), wd = 30 * k * (0.5 + c);
    const nx = -(b.y - B.y) / len, ny = (x - B.x) / len;
    const gr = g.createLinearGradient(B.x, B.y, x, b.y);
    gr.addColorStop(0, `rgba(255,240,255,${(0.16 * c).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,240,255,0)');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(B.x, B.y); g.lineTo(x + nx * wd, b.y + ny * wd); g.lineTo(x - nx * wd, b.y - ny * wd); g.closePath(); g.fill();
  }
  // Two coloured pin spots circling the floor, with faint cones from the ceiling corners.
  for (const p of P.pins) {
    const a = TAU * (u + p.ph), px = W / 2 + Math.sin(a) * 0.3 * W * (p.corner ? -1 : 1), py = P.FLOOR + 0.22 * H + Math.cos(a) * 0.08 * H;
    const cx = p.corner ? W : 0, gr = g.createLinearGradient(cx, 0, px, py);
    const [rr, gg, bb] = hexRgb(p.c).map(v => Math.round(v * 255));
    gr.addColorStop(0, `rgba(${rr},${gg},${bb},0.12)`); gr.addColorStop(1, `rgba(${rr},${gg},${bb},0.03)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, 0); g.lineTo(px + 0.08 * W, py); g.lineTo(px - 0.08 * W, py); g.closePath(); g.fill();
    g.save(); g.translate(px, py); g.scale(1, 0.32); glow(g, 0, 0, 0.11 * W, p.c, 0.5); g.restore();
  }
  g.globalCompositeOperation = 'source-over';

  // Dancers, back row first. Rows tile one screen width, so parallax wraps seamlessly.
  for (const row of P.rows) {
    const off = cfg.pan ? u * W * row.laps : 0, y = row.y * H, h = 0.33 * H * row.s;
    const list = [];
    for (const c of row.couples) {
      const x = ((((c.xn * W - off) % W) + W) % W);
      for (const xx of [x - W, x, x + W]) if (xx > -h && xx < W + h) list.push([xx, c]);
    }
    for (const [x, c] of list) promCouple(g, x, y + (c.xn - 0.5) * 0.02 * H, h, c, u, P.sways);
  }

  // Confetti drifting down, flipping as it falls.
  for (const c of P.confetti) {
    const y = ((c.y + u * c.laps) % 1) * H * 1.05 - 0.02 * H, x = c.x * W + Math.sin(TAU * (u * c.w + c.ph)) * 30 * k;
    const f = Math.cos(TAU * (u * c.spin + c.ph));
    g.fillStyle = c.color; g.globalAlpha = 0.8; g.fillRect(x - 4 * k * Math.abs(f), y, 8 * k * Math.abs(f) + 0.5, 5 * k);
  }
  g.globalAlpha = 1;

  // The mirror ball: its chain, then facet tiles turning with it, flashing where they catch
  // the light.
  g.fillStyle = '#6a6070'; g.fillRect(B.x - 1.5 * k, 0, 3 * k, B.y - B.R + 2 * k);
  g.fillStyle = '#2a2630'; g.beginPath(); g.arc(B.x, B.y, B.R, 0, TAU); g.fill();
  const LAT = 11, Lx = -0.45, Ly = 0.55, Lz = 0.7, sparks = [];
  for (let i = 0; i < LAT; i++) {
    const t0 = (i / LAT) * Math.PI, t1 = ((i + 1) / LAT) * Math.PI, tm = (t0 + t1) / 2;
    const n = Math.max(4, Math.round(24 * Math.sin(tm)));
    for (let j = 0; j < n; j++) {
      const p0 = (j / n) * TAU + rot, p1 = p0 + TAU / n, pm = (p0 + p1) / 2;
      if (Math.cos(pm) <= 0) continue;
      const nx = Math.sin(tm) * Math.sin(pm), ny = Math.cos(tm), nz = Math.sin(tm) * Math.cos(pm);
      const lum = 0.22 + 0.7 * Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const flash = hash(i * 97 + j, step) > 0.95;
      const v = flash ? 1 : lum * (0.75 + 0.25 * hash(i * 31 + j, 7));
      const pt = (t, p) => [B.x + B.R * Math.sin(t) * Math.sin(p), B.y - B.R * Math.cos(t)];
      const q = [pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)];
      g.fillStyle = rgbHex(v * 0.92, v * 0.9, v);
      g.beginPath(); q.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      if (flash && nz > 0.4) sparks.push(pt(tm, pm));
    }
  }
  g.strokeStyle = '#18141c'; g.lineWidth = 1.2 * k; g.beginPath(); g.arc(B.x, B.y, B.R, 0, TAU); g.stroke();

  // The light spots, over everything: brightest and largest facing the room, shrinking and
  // fading as they sweep round to the sides. Spots on the floor are squashed by perspective.
  g.globalCompositeOperation = 'lighter';
  const batches = new Map();
  for (const s of P.spots) {
    const ph = s.ph + rot, c = Math.cos(ph);
    if (c < 0.05) continue;
    const x = W / 2 + Math.sin(ph) * W * 0.62, r = s.sz * k * (0.45 + 0.55 * c), level = Math.min(3, Math.floor(c * 4));
    const key = s.tint + level;
    if (!batches.has(key)) batches.set(key, { tint: s.tint, a: 0.45 + level * 0.18, list: [] });
    batches.get(key).list.push([x, s.y, r, s.y > P.FLOOR]);
  }
  for (const b of batches.values()) {
    g.fillStyle = b.tint;
    for (const [scale, alpha] of [[2.8, 0.16], [1, 1]]) {
      g.globalAlpha = b.a * alpha; g.beginPath();
      for (const [x, y, r, floor] of b.list) {
        const rx = r * scale * (floor ? 1.5 : 1), ry = r * scale * (floor ? 0.55 : 1);
        g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, TAU);
      }
      g.fill();
    }
  }
  // Glints on the ball's flashing facets.
  g.globalAlpha = 1;
  for (const [x, y] of sparks) {
    glow(g, x, y, 14 * k, '#ffffff', 0.8);
    g.fillStyle = '#ffffff'; g.fillRect(x - 12 * k, y - 0.8 * k, 24 * k, 1.6 * k); g.fillRect(x - 0.8 * k, y - 12 * k, 1.6 * k, 24 * k);
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

SCENES.prom = { label: 'School Dance', gen(seed, loop) { genProm(seed, loop); }, draw: drawProm };
