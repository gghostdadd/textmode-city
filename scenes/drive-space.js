'use strict';
// Space Flight (3D): a vintage video-game starfield. Square pixel stars rush out from the
// centre, growing and brightening as they near, each trailing a few fading pixels. Pixel-art
// spiral and elliptical galaxies fly past too, swelling from specks to fill the screen, along
// with the occasional pixel-shaded planet (some ringed) and tumbling low-poly asteroid; far
// behind are a faint dust band, a few tiny galaxies and twinkling fixed stars. The ship banks
// gently from side to side.
// The world repeats every L units of depth and the camera covers it a whole number of times
// per loop, so the flight loops seamlessly; banking, tumbling and twinkling complete whole
// cycles too.

let dspace;

function genDriveSpace(seed, loop) {
  let r = rng(seed * 9311 + 5);
  const W = GW, H = GH, k = W / 1920;
  const pick = a => a[Math.floor(r() * a.length)];
  const L = 24000, passes = Math.max(1, Math.round(loop / 4));
  const STAR = ['#ffffff', '#ffffff', '#ffffff', '#a8c8ff', '#fff0a0', '#ffb0a0'];
  const stars = upTo(560, () => ({ x: (r() - 0.5) * 14000, y: (r() - 0.5) * 8000, z: r() * L, col: pick(STAR) }));
  // Galaxies and planets flying past: billboards at a depth, offset from the flight path so
  // they slide out to the sides as they grow. Bigger ones keep further out.
  const flyer = (minS, maxS) => { const size = minS + r() * (maxS - minS), a = r() * TAU, off = size * 0.45 + 1500 + r() * 4500; return { x: Math.cos(a) * off, y: Math.sin(a) * off * 0.65, z: r() * L, size, img: Math.floor(r() * 4), rot: r() * TAU }; };
  const galaxies = upTo(6, () => flyer(2500, 9000));
  const planets = upTo(1, () => flyer(1200, 3400));
  const rocks = upTo(8, () => {
    const side = r() < 0.5 ? -1 : 1, w = 250 + r() ** 2 * 1100;
    return { x: side * (1500 + r() * 6000), y: (r() - 0.5) * 3000, z: r() * L, w, h: w * (0.7 + r() * 0.6), yaw: r() * TAU, spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2)), col: pick(['#8a8278', '#6e6660', '#9a8670', '#7a7a86']) };
  });

  // Everything below gets its own random sequence, so it stays put when Density changes.
  r = rng(seed * 9311 + 6);
  // One sky pixel is one sample of the character grid (a quarter cell), so stars and galaxy
  // dots survive the conversion to text at any column count.
  const px = Math.max(1, Math.round(Math.max(2 * k, cw / 4)));
  const dot = (g, x, y, s, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, s * px, s * px); };
  // A spiral galaxy: dots along logarithmic arms around a bright core, tilted and inclined.
  const spiral = (g, cx, cy, R, rot, incl, arms, tint) => {
    const cs = Math.cos(rot), sn = Math.sin(rot), place = (dx, dy) => [cx + dx * cs - dy * incl * sn, cy + dx * sn + dy * incl * cs];
    g.globalCompositeOperation = 'lighter';
    glow(g, cx, cy, R * 1.0, tint, 0.3);
    const n = Math.round(R / px) * 6;
    for (let a = 0; a < arms; a++) for (let i = 0; i < n; i++) {
      const t = i / n, ang = (a / arms) * TAU + t * 2.6 * Math.PI, rad = R * (0.08 + 0.92 * t), j = R * 0.07 * (0.3 + t);
      const [x, y] = place(Math.cos(ang) * rad + (r() - 0.5) * j, Math.sin(ang) * rad + (r() - 0.5) * j);
      const hot = r() < 0.04;
      dot(g, x, y, r() < 0.3 ? 2 : 1, hot ? '#ff8ac8' : mixCss('#fff0c0', tint, t), Math.min(1, (1 - t * 0.6) * (0.7 + r() * 0.5)));
    }
    for (let i = 0; i < n / 2; i++) {
      const ang = r() * TAU, rad = R * 0.18 * Math.sqrt(r()), [x, y] = place(Math.cos(ang) * rad, Math.sin(ang) * rad);
      dot(g, x, y, 1, '#fff4d0', 0.6 + r() * 0.4);
    }
    glow(g, cx, cy, R * 0.22, '#fff0c0', 1);
    glow(g, cx, cy, R * 0.1, '#ffffff', 1);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  };
  // An elliptical galaxy: a soft oval haze of dots, densest at the centre.
  const elliptical = (g, cx, cy, R, rot, incl) => {
    g.globalCompositeOperation = 'lighter';
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (let i = 0; i < R * 3; i++) {
      const ang = r() * TAU, rad = R * r() ** 1.8, dx = Math.cos(ang) * rad, dy = Math.sin(ang) * rad * incl;
      dot(g, cx + dx * cs - dy * sn, cy + dx * sn + dy * cs, 1, '#ffe0b0', (1 - rad / R) * 0.8);
    }
    glow(g, cx, cy, R * 0.3, '#ffd8a0', 0.6);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  };
  // Sprites for the flyers, drawn once in chunky pixels.
  const sprite = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); draw(c.getContext('2d'), size / 2); return c; };
  const TINT = ['#7aa8ff', '#b08aff', '#ffa8d8', '#8ad8ff'];
  const galaxyImgs = [0, 1, 2, 3].map(i => sprite(300, (g, c) => (i === 3 ? elliptical(g, c, c, 120, r() * TAU, 0.45 + r() * 0.3) : spiral(g, c, c, 125, r() * TAU, 0.3 + r() * 0.55, 2 + (i % 2), TINT[i]))));
  // A planet shaded block by block from a four-step ramp, with checkerboard dithering
  // between steps, latitude bands, and sometimes a ring (its far half behind the disc).
  const planetImgs = [['#c86a3a', '#f0c080', true], ['#3a8ad8', '#a0e0ff', false], ['#8a5ad8', '#e0b0ff', true], ['#5ab86a', '#d8f0a0', false]].map(([base, band, ringed]) => sprite(ringed ? 360 : 210, (g, c) => {
    const R = 90, P = px, ramp = [mixCss(base, '#000010', 0.8), mixCss(base, '#000010', 0.5), base, mixCss(base, '#ffffff', 0.35)];
    const ring = front => {
      for (let by = -R * 0.5; by < R * 0.5; by += P) for (let bx = -R * 1.9; bx < R * 1.9; bx += P) {
        const e = (bx / (R * 1.85)) ** 2 + (by / (R * 0.42)) ** 2, inner = (bx / (R * 1.3)) ** 2 + (by / (R * 0.28)) ** 2;
        if (e > 1 || inner < 1 || (by < 0) === front || (front === false && bx * bx + by * by < R * R)) continue;
        g.fillStyle = ((bx + by) / P) % 3 === 0 ? '#a08860' : '#e0c898'; g.fillRect(c + bx, c + by, P, P);
      }
    };
    if (ringed) ring(false);
    for (let by = -R; by < R; by += P) for (let bx = -R; bx < R; bx += P) {
      const x = bx + P / 2, y = by + P / 2, d2 = (x * x + y * y) / (R * R);
      if (d2 > 1) continue;
      const lit = clamp(-0.45 * (x / R) - 0.4 * (y / R) + 0.75 * Math.sqrt(1 - d2)), dith = ((bx + by) / P) & 1 ? 0.12 : 0;
      const lvl = Math.min(3, Math.floor(lit * 4 + dith)), col = ramp[lvl];
      g.fillStyle = Math.floor((y / R + 1) * 4.5) % 2 ? mixCss(col, band, 0.3) : col; g.fillRect(c + bx, c + by, P, P);
    }
    if (ringed) ring(true);
  }));
  const twinkle = Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, col: pick(STAR), s: r() < 0.25 ? 2 : 1, ph: Math.floor(r() * 16) }));
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#020008'); gr.addColorStop(0.5, '#050314'); gr.addColorStop(1, '#020008');
    g.fillStyle = gr; g.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    // A faint dust band of tiny stars across the sky.
    const band = r() * 0.6 - 0.3;
    for (let i = 0; i < 1400; i++) {
      const t = r() * 1.4 - 0.2, off = (r() + r() + r() - 1.5) * 0.12;
      dot(g, t * W, H * (0.5 + band * (t - 0.5) * 2 + off), 1, pick(['#8a8ab0', '#b0a0c8', '#ffffff']), 0.15 + r() * 0.35);
    }
    for (let i = 0; i < 260; i++) dot(g, r() * W * 1.2 - W * 0.1, r() * H * 1.2 - H * 0.1, 1, '#ffffff', 0.2 + r() * 0.5);
    // A few tiny far galaxies, kept clear of the centre (the big ones fly past).
    const spot = minR => { for (let i = 0; ; i++) { const x = (0.08 + r() * 0.84) * W, y = (0.12 + r() * 0.76) * H; if (i > 50 || Math.hypot((x - W / 2) / W, (y - H / 2) / H) > minR) return [x, y]; } };
    for (let i = 0; i < 2; i++) { const [x, y] = spot(0.2); spiral(g, x, y, (0.04 + r() * 0.03) * H, r() * TAU, 0.25 + r() * 0.6, 2 + Math.floor(r() * 2), pick(['#7aa8ff', '#b08aff', '#ffa8d8', '#8ad8ff'])); }
    for (let i = 0; i < 2; i++) { const [x, y] = spot(0.15); elliptical(g, x, y, (0.02 + r() * 0.02) * H, r() * TAU, 0.5 + r() * 0.4); }
  });

  dspace = { L, passes, stars, rocks, galaxies, planets, galaxyImgs, planetImgs, twinkle, sky, px, bank: Math.max(1, Math.round(loop / 8)), steps: Math.max(1, Math.round(loop * 6)), k };
}

function drawDriveSpace(u) {
  const g = sctx, S = dspace, W = GW, H = GH, k = S.k, L = S.L, px = S.px;
  const f = DRIVE.DEPTH * (W / 2), camZ = u * L * S.passes, NEAR = 60;
  const zr = z => ((((z - camZ) % L) + L) % L) + NEAR;  // depth in front of the camera
  const roll = 0.07 * Math.sin(TAU * u * S.bank), drift = Math.sin(TAU * u * S.bank) * 0.03 * W;
  const step = Math.floor(u * S.steps) % S.steps;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  // Far sky: banks with the ship and drifts a little as it yaws; fixed stars twinkle.
  g.save(); g.translate(W / 2 - drift, H / 2); g.rotate(roll); g.scale(1.14, 1.14); g.translate(-W / 2, -H / 2);
  g.drawImage(S.sky, 0, 0, W, H);
  for (const t of S.twinkle) {
    const on = hash(t.ph * 131 + Math.round(t.x), step) > 0.3;
    g.globalAlpha = on ? 0.9 : 0.25; g.fillStyle = t.col;
    g.fillRect(Math.round(t.x / px) * px, Math.round(t.y / px) * px, t.s * px, t.s * px);
  }
  g.globalAlpha = 1;
  g.restore();

  // Everything near rolls with the ship about the screen centre.
  g.save(); g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);

  // Flying galaxies, far to near, added on as light.
  const bill = (o, img, alpha, rot) => {
    const z = zr(o.z), Sz = (o.size * f) / z;
    if (z < 150 || Sz > W * 3) return;
    const x = W / 2 + (o.x * f) / z, y = H / 2 + (o.y * f) / z;
    if (x + Sz < 0 || x - Sz > W || y + Sz < 0 || y - Sz > H) return;
    g.globalAlpha = alpha * clamp((L - z) / (L * 0.3));
    g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(img, -Sz / 2, -Sz / 2, Sz, Sz); g.restore();
  };
  g.globalCompositeOperation = 'lighter';
  for (const o of [...S.galaxies].sort((a, b) => zr(b.z) - zr(a.z))) bill(o, S.galaxyImgs[o.img], 1, o.rot);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  // Pixel stars: a square that grows as it nears, with a trail of fading squares behind it
  // at the positions it had a moment earlier. Batched by colour and brightness.
  const TRAIL = 3, GAP = 260 * S.passes, batches = new Map();
  const add = (col, a, x, y, s) => {
    const key = col + a;
    if (!batches.has(key)) batches.set(key, { col, a, rects: [] });
    batches.get(key).rects.push([x, y, s]);
  };
  for (const s of S.stars) {
    const z = zr(s.z);
    if (z > L - 300) continue;
    const near = 1 - z / L, size = Math.max(1, Math.min(6, Math.round(near * near * 6.5))) * px;
    const lvl = Math.min(4, Math.floor(near * 5.5)) / 4;
    for (let t = TRAIL; t >= 0; t--) {
      const zt = z + t * GAP, x = W / 2 + (s.x * f) / zt, y = H / 2 + (s.y * f) / zt;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const ts = t ? Math.max(px, size - t * px) : size;
      add(s.col, ((0.25 + 0.75 * lvl) * (1 - t / (TRAIL + 1))).toFixed(2), Math.round(x / px) * px - ts / 2, Math.round(y / px) * px - ts / 2, ts);
    }
  }
  for (const b of batches.values()) {
    g.fillStyle = b.col; g.globalAlpha = +b.a;
    for (const [x, y, s] of b.rects) g.fillRect(x, y, s, s);
  }
  g.globalAlpha = 1;

  // Planets and asteroids, far to near, fading in out of the distance.
  const solids = [...S.planets.map(o => ({ o, z: zr(o.z), planet: true })), ...S.rocks.map(o => ({ o, z: zr(o.z) }))].sort((a, b) => b.z - a.z);
  for (const { o, z, planet } of solids) {
    if (planet) { bill(o, S.planetImgs[o.img], 1, 0); g.globalAlpha = 1; continue; }
    if (z < 200) continue;
    const a = clamp((L - z) / (L * 0.25));
    drawPrim(g, 'rock', o.x, o.y - o.h / 2, z, o.w, o.h, o.yaw + TAU * u * o.spin, o.col, H / 2, W / 2, a, k * Math.min(1, 3000 / z));
  }
  g.restore();
}

SCENES.dspace = { group: '3D drive', label: 'Space Flight', gen(seed, loop) { genDriveSpace(seed, loop); }, draw: drawDriveSpace };
