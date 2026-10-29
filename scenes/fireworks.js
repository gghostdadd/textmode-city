'use strict';
// Fireworks (side view): just fireworks on a night sky. Rockets climb from the bottom edge as
// a single bright character with a short sparkling trail, then burst into sparks that are each
// one character too: every spark is drawn as a bright mark snapped to the centre of a character
// cell, so the conversion turns it into exactly one glyph. Shells come in peony, chrysanthemum
// (trailing), gold willow, ring, palm, crackle (glittering strobes) and two-colour breaks. Sparks fly out against drag, fall
// under gravity, cool from white-hot to their colour and fade or strobe out; each burst lights
// the sky for a moment and leaves drifting smoke.
// Shells launch on a fixed schedule around the loop. A shell still burning when the loop wraps
// carries on from the start (each shell is drawn at its time this loop and the loop before),
// so the clip loops seamlessly whatever the loop length.

let fw;

function genFireworks(seed, loop) {
  let r = rng(seed * 3851 + 29);
  const W = GW, H = GH, k = W / 1920;
  const pick = a => a[Math.floor(r() * a.length)];
  const COLORS = ['#ff3a3a', '#3aff6a', '#4a8aff', '#ffd040', '#c060ff', '#ffffff', '#3af0ff', '#ff6ad0', '#ff9a30'];
  const TYPES = ['peony', 'chrys', 'willow', 'ring', 'palm', 'crackle', 'peony', 'chrys', 'double'];
  const BASE = H;  // rockets launch from the bottom edge
  const n = Math.max(3, Math.round(loop * 1.25));  // shells per loop at density 1

  // Each shell: when it launches (fraction of the loop; golden-ratio spacing keeps any count
  // even, so Density adds shells without moving the others), where, how high, and its sparks.
  // Density scales the shell count by its square (1× as designed, 3× gives nine times as many
  // shells for a dense finale), from a fixed pool so more shells never move the others.
  const pool = Array.from({ length: Math.ceil(n * 9) }, (_, i) => {
    const type = pick(TYPES), c1 = pick(COLORS), c2 = pick(COLORS);
    const sh = {
      type, t0: (i * 0.6180339887 + r() * 0.05) % 1, x: (0.12 + r() * 0.76) * W, apex: (0.12 + r() * 0.3) * H,
      rise: 1 + r() * 0.6, scale: 0.7 + r() * 0.6, wob: r(), sparks: [],
      drag: type === 'willow' ? 1.1 : 1.7, grav: (type === 'willow' ? 90 : 130) * k,
      life: type === 'willow' ? 3.6 : type === 'crackle' ? 3 : 2.3, trail: type === 'chrys' || type === 'willow' ? 4 : type === 'palm' ? 3 : 1,
    };
    const add = (vx, vy, col, extra = {}) => sh.sparks.push({ vx, vy, col, life: 0.75 + r() * 0.35, ph: r(), ...extra });
    const sphere = (cnt, sp, col) => {
      for (let j = 0; j < cnt; j++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z), v = sp * (0.9 + r() * 0.2); add(Math.cos(a) * s * v, Math.sin(a) * s * v, col); }
    };
    const SP = 520 * k * sh.scale;
    if (type === 'ring') {
      const tilt = r() * Math.PI, squash = 0.25 + r() * 0.5;
      for (let j = 0; j < 40; j++) {
        const a = (j / 40) * TAU, x = Math.cos(a), y = Math.sin(a) * squash;
        add((x * Math.cos(tilt) - y * Math.sin(tilt)) * SP, (x * Math.sin(tilt) + y * Math.cos(tilt)) * SP, c1);
      }
      sphere(10, SP * 0.3, c2);
    } else if (type === 'palm') {
      const arms = 6 + Math.floor(r() * 3);
      for (let a = 0; a < arms; a++) { const ang = (a / arms) * TAU + r() * 0.3; for (let j = 0; j < 5; j++) { const v = SP * (0.55 + j * 0.12); add(Math.cos(ang) * v, Math.sin(ang) * v - 60 * k, '#ffc860'); } }
    } else if (type === 'double') {
      sphere(46, SP, c1); sphere(26, SP * 0.5, c2);
    } else if (type === 'crackle') {
      sphere(40, SP * 0.85, '#ffe8a0');
      for (const s of sh.sparks) s.strobe = true;
    } else {
      sphere(type === 'willow' ? 56 : 64, type === 'willow' ? SP * 0.8 : SP, type === 'willow' ? '#ffb040' : c1);
    }
    return sh;
  });
  const shells = pool.slice(0, Math.max(1, Math.round(n * cfg.density ** 2)));

  // A plain night sky, darkest at the top.
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#010106'); gr.addColorStop(1, '#070514');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });

  fw = { shells, sky, BASE, k };
}

function drawFireworks(u) {
  const g = sctx, F = fw, W = GW, H = GH, k = F.k, L = cfg.loop, BASE = F.BASE;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, F.sky);

  // One character cell per spark, shaped by how bright it is so the conversion picks the
  // classic firework glyphs: a filled block when fresh (@ #), a plus as it cools (+ *), a small
  // dot as it dies (.).
  const mark = (x, y, lvl, h) => {  // h: height scale
    if (lvl >= 4) g.fillRect(x - cw * 0.36, y - ch * 0.3 * h, cw * 0.72, ch * 0.6 * h);
    else if (lvl >= 2) {
      const sz = lvl === 3 ? 1 : 0.7;
      g.fillRect(x - cw * 0.38 * sz, y - ch * 0.09 * h, cw * 0.76 * sz, ch * 0.18 * h);
      g.fillRect(x - cw * 0.11, y - ch * 0.3 * sz * h, cw * 0.22, ch * 0.6 * sz * h);
    } else g.fillRect(x - cw * 0.14, y + ch * 0.1 * h, cw * 0.28, ch * 0.16 * h);
  };
  const cell = (x, y) => [Math.floor(x / cw), Math.floor(y / ch)];
  const batches = new Map();
  const spark = (x, y, col, a) => {
    if (a < 0.04 || x < 0 || x >= W || y < 0 || y >= H) return;
    const lvl = Math.min(4, Math.ceil(a * 4)), key = col + lvl;
    if (!batches.has(key)) batches.set(key, { col, lvl, a: 0.55 + lvl * 0.11, pts: new Set() });
    const [cx, cy] = cell(x, y);
    batches.get(key).pts.add(cx * 100000 + cy);
  };
  const glows = [];

  for (const sh of F.shells) {
    // This shell's age, and its age a loop ago, so a burst still burning at the wrap goes on.
    const base = ((((u - sh.t0) % 1) + 1) % 1) * L;
    for (let age = base; age < sh.rise + sh.life; age += L) {
      if (age < sh.rise) {
        // Climbing: decelerating toward the apex, wobbling slightly, a few trail sparks below.
        const p = age / sh.rise, y = BASE - (BASE - sh.apex) * (1 - (1 - p) ** 2), x = sh.x + Math.sin(TAU * (sh.wob + p * 2)) * 6 * k;
        spark(x, y, '#fff4d0', 1);
        for (let j = 1; j <= 4; j++) {
          const pj = Math.max(0, (age - j * 0.05) / sh.rise), yj = BASE - (BASE - sh.apex) * (1 - (1 - pj) ** 2);
          if (hash(j * 13 + Math.round(sh.x), Math.floor(age * 20)) < 0.7) spark(sh.x + Math.sin(TAU * (sh.wob + pj * 2)) * 6 * k, yj, '#ffb050', 0.8 - j * 0.16);
        }
        continue;
      }
      const t = age - sh.rise, kd = sh.drag, G = sh.grav;
      if (t < 0.3) glows.push([sh.x, sh.apex, 1 - t / 0.3, sh.sparks[0].col]);
      if (t < sh.life + 0.6) glows.push([sh.x, sh.apex - t * 15 * k, 0, '#000', t]);  // smoke
      const pos = tt => {
        const e = 1 - Math.exp(-kd * tt);
        return [e / kd, (G * (tt / kd - e / (kd * kd)))];
      };
      for (const [i, s] of sh.sparks.entries()) {
        const life = sh.life * s.life;
        if (t > life) continue;
        const fade = (1 - t / life) ** 1.3;
        // White-hot for the first moment, then the spark's colour.
        const col = t < 0.12 ? '#ffffff' : s.col;
        let a = fade;
        if (s.strobe && t > 0.5) a = hash(i * 7919 + Math.round(sh.x), Math.floor(t * 14)) < 0.45 ? fade : 0;
        else if (t > life * 0.7 && hash(i * 131, Math.floor(t * 10)) < 0.3) a *= 0.4;  // twinkling out
        for (let j = 0; j < sh.trail; j++) {
          const tj = Math.max(0, t - j * 0.07), [ex, ey] = pos(tj);
          spark(sh.x + s.vx * ex, sh.apex + s.vy * ex + ey, j ? s.col : col, a * (1 - j / (sh.trail + 0.5)));
        }
      }
    }
  }

  // Flashes and smoke behind the sparks.
  g.globalCompositeOperation = 'lighter';
  for (const [x, y, f, col, smoke] of glows) {
    if (smoke !== undefined) continue;
    glow(g, x, y, 140 * k, col, 0.35 * f);
    glow(g, x, y, 600 * k, col, 0.05 * f);
  }
  g.globalCompositeOperation = 'source-over';
  for (const [x, y, , , smoke] of glows) {
    if (smoke === undefined) continue;
    g.globalAlpha = (0.035 / Math.max(1, cfg.density ** 2)) * Math.max(0, 1 - smoke / 3.5);  // thinner when crowded g.fillStyle = '#8a8098';
    g.beginPath(); g.arc(x + smoke * 12 * k, y, (90 + smoke * 70) * k, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;

  // The sparks.
  g.globalCompositeOperation = 'lighter';
  for (const b of batches.values()) {
    g.fillStyle = b.col; g.globalAlpha = b.a;
    for (const p of b.pts) mark((Math.floor(p / 100000) + 0.5) * cw, ((p % 100000) + 0.5) * ch, b.lvl, 1);
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

SCENES.fireworks = { label: 'Fireworks', gen(seed, loop) { genFireworks(seed, loop); }, draw: drawFireworks };
