'use strict';
// Coral Reef (side view): a crowded, colourful reef in deep blue water. Red, pink, orange and
// purple soft-coral trees (puffs of polyps on pale branching stems) rise from a reef of
// massive boulder corals, cauliflower and brain corals, white bushy corals, sea fans, tube
// sponges and plate corals. A bubble-tip anemone pulses in the middle with a pair of
// clownfish weaving through it, a swarm of orange anthias hovers over the reef, schools of
// chromis cross mid-water, a sea whip sways, far-off fish drift in the blue, light shafts
// slant down from a rippling surface, and bubbles and marine snow drift.
// Everything moves in whole cycles per loop. Parallax scrolls the far reef, the main reef
// (with everything living on it) and the foreground corals 1, 2 and 3 screen widths per loop.

let reef;

// n polyp dots within radius R of (x, y), in three shades of col (shadow, body, light), one
// batched fill per shade.
function reefPolyps(g, r, x, y, R, col, n, size) {
  const shades = [mixCss(col, '#0a0a30', 0.45), col, mixCss(col, '#ffffff', 0.4)];
  const pts = Array.from({ length: n }, () => { const a = r() * TAU, d = R * Math.sqrt(r()); return [x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, size * (0.7 + r() * 0.6)]; });
  // A dark rim under every polyp first, so clusters read as distinct puffs against each other.
  [[-1, 1.22, 0.1], [0, 1, 0.3], [1, 0.8, 0], [2, 0.42, -0.3]].forEach(([si, sc, off]) => {
    g.fillStyle = si < 0 ? '#140a1c' : shades[si]; g.beginPath();
    for (const [px, py, s] of pts) { const cx = px + off * s, cy = py + off * s, rr = s * sc; g.moveTo(cx + rr, cy); g.arc(cx, cy, rr, 0, TAU); }
    g.fill();
  });
}

// A soft-coral tree: pale translucent stems forking upward, every node puffed with polyps.
function reefSoftCoral(g, r, x, y, s, col, depth = 4) {
  const stem = mixCss(col, '#fff0f4', 0.55), nodes = [];
  g.lineCap = 'round';
  const grow = (bx, by, len, ang, w, d) => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    g.strokeStyle = stem; g.globalAlpha = 0.8; g.lineWidth = w;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo((bx + ex) / 2 + (r() - 0.5) * len * 0.3, (by + ey) / 2, ex, ey); g.stroke();
    nodes.push([ex, ey, len]);
    if (d > 0) {
      const nb = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < nb; i++) grow(ex, ey, len * (0.62 + r() * 0.2), ang + (i - (nb - 1) / 2) * 0.55 + (r() - 0.5) * 0.3, w * 0.7, d - 1);
    }
  };
  grow(x, y, 70 * s, -Math.PI / 2 + (r() - 0.5) * 0.3, 16 * s, depth);
  g.globalAlpha = 1;
  for (const [nx, ny, len] of nodes) reefPolyps(g, r, nx, ny, Math.max(10 * s, len * 0.6), col, Math.round(8 + len / (3 * s)), 4.5 * s);
}

// A massive boulder coral: a lumpy dome, lit on top, mottled with pores.
function reefBoulder(g, r, x, y, rx, ry, col, s) {
  const pts = Array.from({ length: 24 }, (_, i) => { const a = Math.PI + (i / 23) * Math.PI, j = 0.86 + r() * 0.22; return [x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]; });
  const path = () => { g.beginPath(); g.moveTo(x - rx, y + 4 * s); pts.forEach(([px, py]) => g.lineTo(px, py)); g.lineTo(x + rx, y + 4 * s); g.closePath(); };
  g.strokeStyle = '#140a1c'; g.lineWidth = 5 * s; path(); g.stroke();
  g.fillStyle = mixCss(col, '#08102a', 0.4); path(); g.fill();
  g.save(); path(); g.clip();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - rx * 0.15, y - ry * 0.1, rx * 0.88, ry * 0.95, 0, 0, TAU); g.fill();
  for (const [c2, n] of [[mixCss(col, '#ffffff', 0.3), 140], [mixCss(col, '#0a1030', 0.3), 180]]) {
    g.fillStyle = c2; g.beginPath();
    for (let i = 0; i < n; i++) { const px = x + (r() - 0.5) * 2 * rx, py = y - r() * ry * 1.1, d = (1.5 + r() * 3.5) * s; g.moveTo(px + d, py); g.arc(px, py, d, 0, TAU); }
    g.fill();
  }
  g.restore();
}

// Cauliflower coral: a mound of packed knobbly heads.
function reefCauli(g, r, x, y, s, col) {
  const heads = Array.from({ length: 34 }, () => { const a = Math.PI + r() * Math.PI, d = Math.sqrt(r()); return [x + Math.cos(a) * 80 * s * d, y + Math.sin(a) * 60 * s * d, (9 + r() * 7) * s]; }).sort((p, q) => p[1] - q[1]);
  for (const [cs, sc, off] of [['#140a1c', 1.14, 0.1], [mixCss(col, '#141030', 0.5), 1, 0.15], [col, 0.82, -0.05], [mixCss(col, '#ffffff', 0.45), 0.35, -0.35]]) {
    g.fillStyle = cs; g.beginPath();
    for (const [hx, hy, hr] of heads) { const cx = hx + off * hr, cy = hy + off * hr; g.moveTo(cx + hr * sc, cy); g.arc(cx, cy, hr * sc, 0, TAU); }
    g.fill();
  }
}

// Brain coral: a dome with meandering grooves.
function reefBrain(g, r, x, y, s, col) {
  const rx = 90 * s, ry = 62 * s, dark = mixCss(col, '#0a1830', 0.45);
  g.strokeStyle = '#140a1c'; g.lineWidth = 5 * s; g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, TAU); g.stroke();
  g.fillStyle = dark; g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(x, y, rx * 0.95, ry * 0.94, 0, Math.PI, TAU); g.clip();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - rx * 0.12, y, rx * 0.86, ry * 0.86, 0, Math.PI, TAU); g.fill();
  g.strokeStyle = dark; g.lineWidth = 3 * s;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.05) { const px = x - rx + t * 2 * rx, py = y - ry + (i / 9) * ry * 1.05 + Math.sin(t * 22 + i * 1.7) * 6 * s; t ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
  }
  g.restore();
}

// Sea fan: ribs spreading from the base, laced with cross arcs.
function reefFan(g, r, x, y, s, col) {
  g.strokeStyle = col; g.lineWidth = 2.4 * s; g.globalAlpha = 0.9;
  const R = 150 * s, lean = (r() - 0.5) * 0.4;
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + lean + (i / 14 - 0.5) * 1.9;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.6, x + Math.cos(a) * R, y + Math.sin(a) * R * (0.85 + r() * 0.15)); g.stroke();
  }
  g.lineWidth = 1.4 * s;
  for (let j = 1; j <= 5; j++) { g.beginPath(); g.ellipse(x, y, (R * j) / 5.4, ((R * j) / 5.4) * 0.95, lean, Math.PI + 0.25, TAU - 0.25); g.stroke(); }
  g.globalAlpha = 1;
}

// Tube sponges and plate coral.
function reefTubes(g, r, x, y, s, col) {
  const dark = mixCss(col, '#0a1830', 0.4);
  for (let i = 0; i < 4; i++) {
    const tx = x + (i - 1.5) * 24 * s, th = (70 + r() * 90) * s, tw = (16 + r() * 6) * s;
    g.fillStyle = i % 2 ? col : dark; g.strokeStyle = '#140a1c'; g.lineWidth = 3 * s;
    g.beginPath(); g.roundRect(tx - tw / 2, y - th, tw, th, tw / 2); g.stroke(); g.fill();
    g.fillStyle = '#081420'; g.beginPath(); g.ellipse(tx, y - th + tw * 0.4, tw * 0.32, tw * 0.18, 0, 0, TAU); g.fill();
  }
}
function reefPlate(g, r, x, y, s, col) {
  g.fillStyle = mixCss(col, '#0a1830', 0.5); g.fillRect(x - 8 * s, y - 60 * s, 16 * s, 60 * s);
  g.strokeStyle = '#140a1c'; g.lineWidth = 4 * s; g.beginPath(); g.ellipse(x, y - 62 * s, 130 * s, 22 * s, 0, 0, TAU); g.stroke();
  g.fillStyle = mixCss(col, '#0a1830', 0.3); g.beginPath(); g.ellipse(x, y - 62 * s, 130 * s, 22 * s, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - 6 * s, y - 68 * s, 118 * s, 13 * s, 0, 0, TAU); g.fill();
  g.fillStyle = mixCss(col, '#ffffff', 0.4); g.beginPath();
  for (let i = 0; i < 40; i++) { const px = x + (r() - 0.5) * 210 * s, py = y - 68 * s + (r() - 0.5) * 14 * s, d = 2 * s; g.moveTo(px + d, py); g.arc(px, py, d, 0, TAU); }
  g.fill();
}

// A small fish at (x, y) heading dir (+1 right), len long, tail beating with phase t.
function reefFish(g, x, y, len, dir, body, fin, t) {
  const hl = len / 2, wag = Math.sin(t) * len * 0.18;
  g.strokeStyle = '#0a0612'; g.lineWidth = Math.max(1, len * 0.08); g.lineJoin = 'round';
  g.fillStyle = fin; g.beginPath();
  g.moveTo(x - dir * hl * 0.8, y); g.lineTo(x - dir * hl * 1.45, y - len * 0.28 + wag); g.lineTo(x - dir * hl * 1.45, y + len * 0.28 + wag); g.closePath(); g.stroke(); g.fill();
  g.fillStyle = body; g.beginPath(); g.ellipse(x, y, hl, len * 0.24, 0, 0, TAU); g.stroke(); g.fill();
  g.fillStyle = '#081018'; g.fillRect(x + dir * hl * 0.55 - len * 0.04, y - len * 0.07, len * 0.08, len * 0.08);
}

// A clownfish: deep golden-orange body with two white bars edged in black, yellow fins.
function reefClown(g, x, y, len, dir, t) {
  const hl = len / 2, hh = len * 0.3, wag = Math.sin(t) * len * 0.15;
  g.fillStyle = '#ffd820';
  g.beginPath(); g.moveTo(x - dir * hl * 0.85, y); g.lineTo(x - dir * hl * 1.5, y - hh * 0.9 + wag); g.lineTo(x - dir * hl * 1.5, y + hh * 0.9 + wag); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x - dir * hl * 0.1, y - hh * 0.95, hl * 0.6, hh * 0.35, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x + dir * hl * 0.1, y + hh * 0.75, hl * 0.25, hh * 0.45, dir * 0.6, 0, TAU); g.fill();
  g.strokeStyle = '#0a0612'; g.lineWidth = Math.max(1, len * 0.05); g.beginPath(); g.ellipse(x, y, hl, hh, 0, 0, TAU); g.stroke();
  g.fillStyle = '#ff9a10'; g.beginPath(); g.ellipse(x, y, hl, hh, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(x, y, hl, hh, 0, 0, TAU); g.clip();
  for (const bx of [0.45, -0.15]) {
    g.fillStyle = '#101010'; g.fillRect(x + dir * hl * bx - len * 0.085, y - hh, len * 0.17, hh * 2);
    g.fillStyle = '#ffffff'; g.fillRect(x + dir * hl * bx - len * 0.05, y - hh, len * 0.1, hh * 2);
  }
  g.restore();
  g.fillStyle = '#101010'; g.beginPath(); g.arc(x + dir * hl * 0.68, y - hh * 0.2, len * 0.045, 0, TAU); g.fill();
}

function genReef(seed, loop) {
  let r = rng(seed * 4409 + 17);
  const W = GW, H = GH, k = W / 1920;
  const pick = a => a[Math.floor(r() * a.length)];
  // The reef's top edge, periodic over one screen width so the layers tile.
  const top = x => H * (0.6 - 0.06 * Math.sin((TAU * x) / W + 0.8) - 0.03 * Math.sin((TAU * x * 3) / W + 2) - 0.015 * Math.sin((TAU * x * 7) / W));
  const SOFT = ['#ff3a5a', '#ff6a3a', '#ff4f9a', '#e8306a', '#ff8a4a', '#b04ad8', '#ff5a7a'];
  const HARD = ['#c8b480', '#9ab87a', '#5ab8b0', '#d8c8a0', '#8aa0b8', '#b89a70'];
  const sways = Math.max(1, Math.round(loop / 4));

  // Animated life. Anthias hover over the main reef; chromis schools cross mid-water.
  const anthias = upTo(46, () => {
    const x = r() * W;
    return { x, y: top(x) - (0.03 + r() * 0.22) * H, ax: (20 + r() * 60) * k, ay: (8 + r() * 25) * k, cx: 1 + Math.floor(r() * 2), cy: 1 + Math.floor(r() * 3), ph: r(), len: (20 + r() * 12) * k, col: pick(['#ffa020', '#ff8a30', '#ffc040', '#ff7a6a']) };
  });
  const schools = upTo(3, () => {
    const dir = r() < 0.5 ? 1 : -1;
    return {
      dir, x0: r(), y: (0.15 + r() * 0.3) * H, laps: 1 + Math.floor(r() * 2), ph: r(), col: pick([['#5ad8f0', '#2a8ad8'], ['#8af0a0', '#3aa86a'], ['#f0f0ff', '#9aa8d8']]),
      fish: Array.from({ length: 14 }, () => ({ dx: (r() - 0.5) * 260, dy: (r() - 0.5) * 100, ph: r(), z: 0.75 + r() * 0.35 })),
    };
  });
  const far = upTo(70, () => ({ x: r(), y: r(), ph: r(), cx: 1 + Math.floor(r() * 2) }));
  const bubbles = upTo(30, () => ({ x: r() * W, ph: r(), laps: 1 + Math.floor(r() * 3), w: 1 + Math.floor(r() * 3), s: (2 + r() * 5) * k }));
  const snow = upTo(90, () => ({ x: r() * W, y: r() * H, w: 1 + Math.floor(r() * 2), ph: r() }));
  const whips = upTo(3, () => ({ x: r() * W, h: (0.25 + r() * 0.2) * H, ph: r() }));

  // Everything below gets its own random sequence, so it stays put when Density changes.
  r = rng(seed * 4409 + 18);
  const rays = Array.from({ length: 6 }, () => ({ x: r() * W, w: (40 + r() * 90) * k, ph: r(), lean: 0.12 + r() * 0.12 }));
  // The bubble-tip anemone: a mound of bulbs that pulse; its clownfish pair weave through it.
  const anX = (0.35 + r() * 0.3) * W, anemone = { x: anX, y: top(anX) + 0.3 * H, bulbs: [] };
  for (let i = 0; i < 130; i++) {
    const a = Math.PI + r() * Math.PI, d = Math.sqrt(r());
    anemone.bulbs.push({ dx: Math.cos(a) * 300 * k * d, dy: Math.sin(a) * 190 * k * d, r: (20 + r() * 14) * k, ph: r() });
  }
  anemone.bulbs.sort((p, q) => p.dy - q.dy);

  const water = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2a6af0'); gr.addColorStop(0.35, '#0e44c8'); gr.addColorStop(0.75, '#0a2e98'); gr.addColorStop(1, '#081e6a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter'; glow(g, W * 0.5, -0.1 * H, 0.7 * H, '#3a8aff', 0.35); g.globalCompositeOperation = 'source-over';
  });
  // Far reef: hazy blue silhouettes, tiling one screen width.
  const farReef = paintLayer(g => {
    for (const dx of [-W, 0, W]) {
      g.fillStyle = '#1a46b0'; g.beginPath(); g.moveTo(dx, H);
      for (let x = 0; x <= W; x += 8 * k) g.lineTo(dx + x, top(x) - 0.08 * H + 0.03 * H * Math.sin((TAU * x * 5) / W));
      g.lineTo(dx + W, H); g.fill();
      for (let i = 0; i < 18; i++) {
        const x = ((i + 0.5) / 18) * W + dx, y = top((i + 0.5) / 18 * W) - 0.07 * H;
        g.fillStyle = i % 2 ? '#1c4ab8' : '#2252c0';
        if (i % 3 === 0) { g.beginPath(); g.arc(x, y - 0.05 * H, 0.05 * H, 0, TAU); g.arc(x + 0.03 * H, y - 0.08 * H, 0.035 * H, 0, TAU); g.fill(); g.fillRect(x - 4 * k, y - 0.05 * H, 8 * k, 0.06 * H); }
        else { g.beginPath(); g.ellipse(x, y, 0.06 * H, 0.04 * H, 0, Math.PI, TAU); g.fill(); }
      }
    }
  });
  // Main reef: rock body under the reef top, crowded with corals, lightly hazed by the water.
  const mainItems = upTo(16, () => ({ x: r() * W, type: pick(['soft', 'soft', 'boulder', 'fan', 'bushy', 'cauli', 'brain', 'soft']), col: '', s: 0.8 + r() * 0.7, seed: r() }));
  mainItems.forEach(it => { it.col = it.type === 'soft' || it.type === 'fan' ? pick(SOFT) : it.type === 'bushy' ? pick(['#f4f0f0', '#f0e8d8', '#e8f0f8']) : pick(HARD); });
  // Coral heads covering the reef's face below its top edge: d is how far down (0 = top).
  const slope = upTo(44, () => ({ x: r() * W, d: r() * 0.85, type: pick(['cauli', 'boulder', 'brain', 'bushy', 'soft', 'cauli', 'tubes', 'plate']), s: 0.55 + r() * 0.5, seed: r(), col: '' }));
  slope.forEach(it => { it.col = it.type === 'soft' ? pick(SOFT) : it.type === 'bushy' ? pick(['#f4f0f0', '#f0e8d8', '#ffd8e8']) : it.type === 'tubes' ? pick(['#b04ad8', '#ff8a3a', '#f0c030', '#3ac8d8']) : pick([...HARD, '#e86a8a', '#f0a040']); });
  const main = paintLayer(g => {
    const items = [...mainItems].sort((a, b) => b.s - a.s);
    for (const dx of [-W, 0, W]) {
      // Rock: dark purple-brown, encrusted with flecks of colour.
      g.fillStyle = '#24142c'; g.beginPath(); g.moveTo(dx, H);
      for (let x = 0; x <= W; x += 8 * k) g.lineTo(dx + x, top(x));
      g.lineTo(dx + W, H); g.fill();
      const fr = rng(911);
      for (const col of ['#b04a6a', '#3a8a8a', '#c89a4a', '#7a5ab0', '#d86a4a']) {
        g.fillStyle = col; g.beginPath();
        g.globalAlpha = 0.45;
        for (let i = 0; i < 110; i++) { const x = fr() * W, y = top(x) + fr() * (H - top(x)), d = (2 + fr() * 5) * k; g.moveTo(dx + x + d, y); g.arc(dx + x, y, d, 0, TAU); }
        g.fill(); g.globalAlpha = 1;
      }
      // Slope heads, top ones first so lower ones overlap them, then the big corals on top.
      for (const it of [...slope].sort((a, b) => a.d - b.d)) {
        const rr = rng(Math.floor(it.seed * 1e9)), x = dx + it.x, y = top(it.x) + it.d * (H - top(it.x)) + 20 * k, s = it.s * k;
        if (it.type === 'soft') reefSoftCoral(g, rr, x, y, s, it.col, 3);
        else if (it.type === 'bushy') reefSoftCoral(g, rr, x, y, s * 0.8, it.col, 3);
        else if (it.type === 'boulder') reefBoulder(g, rr, x, y, 130 * s, 90 * s, it.col, s);
        else if (it.type === 'tubes') reefTubes(g, rr, x, y, s, it.col);
        else if (it.type === 'plate') reefPlate(g, rr, x, y, s, it.col);
        else if (it.type === 'cauli') reefCauli(g, rr, x, y, s * 1.2, it.col);
        else reefBrain(g, rr, x, y, s, it.col);
      }
      for (const it of items) {
        const rr = rng(Math.floor(it.seed * 1e9)), x = dx + it.x, y = top(it.x) + 10 * k, s = it.s * k;
        if (it.type === 'soft') reefSoftCoral(g, rr, x, y, s * 1.2, it.col);
        else if (it.type === 'bushy') reefSoftCoral(g, rr, x, y, s * 0.8, it.col, 3);
        else if (it.type === 'boulder') reefBoulder(g, rr, x, y, 150 * s, 120 * s, it.col, s);
        else if (it.type === 'fan') reefFan(g, rr, x, y, s, it.col);
        else if (it.type === 'cauli') reefCauli(g, rr, x, y, s, it.col);
        else reefBrain(g, rr, x, y, s, it.col);
      }
    }
    // A wash of the water's blue over the whole layer, to set it back behind the foreground.
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#1a3ab0'; g.globalAlpha = 0.12; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  });
  // Foreground: big, crisp corals crowding the bottom edge.
  const frontItems = upTo(14, () => ({ x: r() * W, type: pick(['cauli', 'bushy', 'soft', 'boulder', 'tubes', 'plate', 'brain', 'bushy']), s: 1.1 + r() * 0.8, seed: r(), col: '' }));
  frontItems.forEach(it => { it.col = it.type === 'soft' ? pick(SOFT) : it.type === 'bushy' ? pick(['#f8f4f4', '#f4ecdc']) : it.type === 'tubes' ? pick(['#b04ad8', '#ff8a3a', '#f0c030']) : pick(HARD); });
  const front = paintLayer(g => {
    const items = [...frontItems].sort((a, b) => a.s - b.s);
    for (const dx of [-W, 0, W]) for (const it of items) {
      const rr = rng(Math.floor(it.seed * 1e9)), x = dx + it.x, y = H * 1.02, s = it.s * k;
      if (it.type === 'soft') reefSoftCoral(g, rr, x, y, s, it.col, 3);
      else if (it.type === 'bushy') reefSoftCoral(g, rr, x, y, s * 0.9, it.col, 3);
      else if (it.type === 'boulder') reefBoulder(g, rr, x, y, 170 * s, 110 * s, it.col, s);
      else if (it.type === 'tubes') reefTubes(g, rr, x, y, s, it.col);
      else if (it.type === 'plate') reefPlate(g, rr, x, y, s, it.col);
      else if (it.type === 'cauli') reefCauli(g, rr, x, y, s * 1.3, it.col);
      else reefBrain(g, rr, x, y, s, it.col);
    }
  });

  reef = { anthias, schools, far, bubbles, snow, whips, rays, anemone, water, farReef, main, front, top, sways, k };
}

function drawReef(u) {
  const g = sctx, R = reef, W = GW, H = GH, k = R.k;
  const lap = n => (cfg.pan ? u * W * n : 0);
  const wrap = (x, n) => ((((x - lap(n)) % W) + W) % W);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, R.water);

  // Surface ripples and light shafts.
  g.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 3; band++) {
    g.strokeStyle = '#a8d8ff'; g.globalAlpha = 0.3 - band * 0.08; g.lineWidth = (6 - band * 1.5) * k;
    g.beginPath();
    for (let x = 0; x <= W; x += 12 * k) {
      const y = (0.02 + band * 0.022) * H + Math.sin((TAU * x * (3 + band)) / W + TAU * u * (2 + band)) * 8 * k + Math.sin((TAU * x * 11) / W - TAU * u * 3) * 3 * k;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  for (const ray of R.rays) {
    const a = 0.12 + 0.07 * Math.sin(TAU * (u * 2 + ray.ph)), x0 = ray.x + Math.sin(TAU * (u + ray.ph)) * 30 * k, len = H * 0.8;
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, `rgba(170,210,255,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(170,210,255,0)');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(x0 - ray.w / 2, 0); g.lineTo(x0 + ray.w / 2, 0); g.lineTo(x0 + ray.w * 1.6 + len * ray.lean, len); g.lineTo(x0 - ray.w * 1.2 + len * ray.lean, len); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  // Far-off fish drifting in the blue, then the far reef.
  g.fillStyle = '#0a1e6a';
  for (const f of R.far) {
    const x = wrap(f.x * W + Math.sin(TAU * (u * f.cx + f.ph)) * 60 * k, 1), y = (0.12 + f.y * 0.3) * H + Math.cos(TAU * (u * f.cx + f.ph)) * 12 * k;
    g.fillRect(x, y, 7 * k, 2.5 * k);
  }
  blitTile(g, R.farReef, lap(1));

  // Chromis schools crossing mid-water.
  const span = W * 1.5;
  for (const sc of R.schools) {
    const cx = ((((sc.x0 * span + sc.dir * u * span * sc.laps) % span) + span) % span) - W * 0.25, cy = sc.y + Math.sin(TAU * (u + sc.ph)) * 30 * k;
    for (const [i, f] of sc.fish.entries()) {
      const x = cx + f.dx * k + Math.sin(TAU * (u * 3 + f.ph)) * 10 * k, y = cy + f.dy * k + Math.cos(TAU * (u * 2 + f.ph)) * 6 * k;
      reefFish(g, x, y, 26 * k * f.z, sc.dir, sc.col[0], sc.col[1], TAU * (u * 24 + f.ph + i * 0.13));
    }
  }

  blitTile(g, R.main, lap(2));

  // Sea whips swaying up from the reef.
  g.strokeStyle = '#a03a2a'; g.lineCap = 'round'; g.lineWidth = 4 * k;
  for (const w of R.whips) for (const dx of [-W, 0, W]) {
    const x0 = wrap(w.x, 2) + dx;
    if (x0 < -100 * k || x0 > W + 100 * k) continue;
    const y0 = R.top(w.x) + 10 * k;
    g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i <= 12; i++) { const t = i / 12; g.lineTo(x0 + Math.sin(TAU * (u * R.sways + w.ph) + t * 2) * t * 50 * k, y0 - t * w.h); }
    g.stroke();
  }

  // Anthias hovering over the reef, each circling its own spot and facing the way it moves.
  for (const a of R.anthias) {
    const p = TAU * (u * a.cx + a.ph), x = wrap(a.x, 2) + Math.sin(p) * a.ax, y = a.y + Math.sin(TAU * (u * a.cy + a.ph)) * a.ay;
    reefFish(g, x > W + 40 * k ? x - W : x, y, a.len, Math.cos(p) >= 0 ? 1 : -1, a.col, '#ffb0c0', TAU * (u * 30 + a.ph));
  }

  // The bubble-tip anemone, pulsing, with its clownfish pair weaving in and out.
  const A = R.anemone;
  for (const dx of [-W, 0, W]) {
    const ax = wrap(A.x, 2) + dx;
    if (ax < -400 * k || ax > W + 400 * k) continue;
    const clowns = [0, 0.5].map(o => {
      const p = TAU * (u * 2 + o), x = ax + Math.sin(p) * 230 * k, y = A.y - 190 * k + Math.sin(TAU * (u * 3 + o)) * 50 * k;
      return { x, y, dir: Math.cos(p) >= 0 ? 1 : -1, behind: Math.sin(TAU * (u * 2 + o) * 0.5 + o * 3) < -0.3 };
    });
    for (const c of clowns) if (c.behind) reefClown(g, c.x, c.y, 110 * k, c.dir, TAU * u * 28);
    for (const b of A.bulbs) {
      const rr = b.r * (1 + 0.08 * Math.sin(TAU * (u * R.sways * 2 + b.ph))), x = ax + b.dx, y = A.y + b.dy;
      g.fillStyle = '#140a1c'; g.beginPath(); g.arc(x, y, rr * 1.08, 0, TAU); g.fill();
      g.fillStyle = '#5a5a48'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.fillStyle = '#b8b8a0'; g.beginPath(); g.arc(x - rr * 0.06, y - rr * 0.06, rr * 0.88, 0, TAU); g.fill();
      g.fillStyle = '#e4e4d4'; g.beginPath(); g.arc(x - rr * 0.2, y - rr * 0.2, rr * 0.55, 0, TAU); g.fill();
    }
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.75; g.beginPath();
    for (const b of A.bulbs) { const x = ax + b.dx - b.r * 0.3, y = A.y + b.dy - b.r * 0.35, d = b.r * 0.22; g.moveTo(x + d, y); g.arc(x, y, d, 0, TAU); }
    g.fill(); g.globalAlpha = 1;
    for (const c of clowns) if (!c.behind) reefClown(g, c.x, c.y, 110 * k, c.dir, TAU * u * 28);
  }

  blitTile(g, R.front, lap(3));

  // Bubbles rising and marine snow drifting.
  g.strokeStyle = '#d8f0ff'; g.lineWidth = 1.5 * k;
  for (const b of R.bubbles) {
    const p = (b.ph + u * b.laps) % 1, base = R.top(b.x), x = wrap(b.x, 2) + Math.sin(TAU * (u * b.w + b.ph) + p * 9) * 10 * k, y = base - p * base * 0.95;
    g.globalAlpha = 0.7 * (1 - p * 0.8); g.beginPath(); g.arc(x, y, b.s * (0.6 + p * 0.6), 0, TAU); g.stroke();
  }
  g.fillStyle = '#e0f0ff';
  for (const s of R.snow) {
    const y = ((s.y + u) % 1) * H, x = s.x + Math.sin(TAU * (u * s.w + s.ph)) * 20 * k;
    g.globalAlpha = 0.35; g.fillRect(x, y, 2 * k + 0.5, 2 * k + 0.5);
  }
  g.globalAlpha = 1;
}

SCENES.reef = { label: 'Coral Reef', gen(seed, loop) { genReef(seed, loop); }, draw: drawReef };
