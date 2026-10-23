'use strict';
// Dune Sea: a moonlit desert night. The Milky Way arcs over twinkling stars and a shooting
// star; five overlapping dune ridges, far to near, each with a moonlit windward face, a dark
// slip face, wind ripples and a bright crest line. Sand streams off the nearest crests.
// Parallax slides the three nearest ridges 1, 2 and 3 screen widths per loop.

let dunes;

function genDesert(seed, loop) {
  const r = rng(seed * 4409 + 11), W = GW, H = GH, k = W / 1920;
  const moonLeft = r() < 0.5;

  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.7);
    gr.addColorStop(0, '#01020a'); gr.addColorStop(0.6, '#060a24'); gr.addColorStop(1, '#1e2048');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // Milky Way: a soft band across the sky, dense with faint stars and split by dust lanes.
    const ax = 0, ay = 0.6 * H, bx = W, by = 0.02 * H, len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 260; i++) {
      const t = r(), o = (r() + r() + r() - 1.5) * 0.09 * H;
      g.globalAlpha = 0.035; g.fillStyle = r() < 0.7 ? '#8a8ac8' : '#c8a0c0';
      g.beginPath(); g.ellipse(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o, (30 + r() * 60) * k, (14 + r() * 24) * k, Math.atan2(by - ay, bx - ax), 0, TAU); g.fill();
    }
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 1400; i++) {
      const t = r(), o = (r() + r() + r() - 1.5) * 0.1 * H;
      g.globalAlpha = 0.15 + r() * 0.5; g.fillRect(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o, 1.5 * k + 0.5, 1.5 * k + 0.5);
    }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#03040e';
    for (let i = 0; i < 40; i++) {
      const t = r(), o = (r() - 0.5) * 0.03 * H;
      g.globalAlpha = 0.35; g.beginPath(); g.ellipse(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o, (20 + r() * 50) * k, (5 + r() * 9) * k, Math.atan2(by - ay, bx - ax) + (r() - 0.5) * 0.4, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    const mx = (moonLeft ? 0.16 : 0.84) * W, my = 0.17 * H, mr = 0.04 * H;
    glow(g, mx, my, mr * 6, '#c8d0ff', 0.18);
    g.fillStyle = '#f4f2e6'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    g.fillStyle = '#d8d4c4';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, mr * (0.1 + r() * 0.15), 0, TAU); g.fill(); }
  });

  // Dune ridges: each crest has a long windward side and a short steep slip face.
  const BASES = [0.62, 0.68, 0.76, 0.86, 0.99];
  const layers = BASES.map((base, i) => {
    const n = Math.max(1, Math.round((3 + Math.floor(r() * 2)) * cfg.density)), amp = 0.04 + i * 0.03;
    const ds = Array.from({ length: n }, (_, j) => ({ c: (j + 0.2 + r() * 0.6) / n, h: amp * (0.6 + r() * 0.6), wl: 0.18 + r() * 0.18, ws: 0.07 + r() * 0.06 }));
    const roll = Array.from({ length: 3 }, (_, j) => ({ f: j + 1 + Math.floor(r() * 2), a: (0.012 + i * 0.004) / (j + 1), p: r() }));
    // Rounded crests: an eased windward rise and a concave slip face.
    // Slip faces point away from the moon, so mirror the profile when the moon is on the right.
    const at = x => {
      let best = 0, bd = null, side = 0, bdx = 0;
      const xm = moonLeft ? x : -x;
      for (const d of ds) {
        let dx = xm - (moonLeft ? d.c : -d.c); dx -= Math.round(dx);
        let v = 0;
        if (dx < 0 && dx > -d.wl) { const s = 1 + dx / d.wl; v = d.h * s * s * (3 - 2 * s); }
        else if (dx >= 0 && dx < d.ws) { const s = dx / d.ws; v = d.h * (1 - s * s) * (1 - s * 0.5); }
        if (v > best) { best = v; bd = d; side = dx < 0 ? -1 : 1; bdx = dx; }
      }
      const rollY = roll.reduce((s, q) => s + q.a * Math.sin(TAU * (q.f * x + q.p)), 0);
      return { y: base - best - rollY, d: bd, side, dx: bdx, top: bd ? base - bd.h - rollY : base };
    };
    const f = i / (BASES.length - 1);
    const lit = hexRgb(mixCss('#5a5a8c', '#d8b090', f)), dark = hexRgb(mixCss('#16163a', '#22121c', f)), crest = mixCss('#9090c0', '#ffe8d0', f);
    const body = mixCss('#24244a', '#3a2830', f);
    const layer = paintLayer(g => {
      // Each dune's crest line runs diagonally down from its summit on the slip side: above it
      // is the shadowed slip face, below and windward of it is moonlit sand.
      const step = 2 * k, litCss = rgbHex(...lit), darkCss = rgbHex(...dark);
      const crestY = p => p.top + (p.dx / (p.d.ws * 1.4)) * (base + 0.1 - p.top);
      for (let x = 0; x < W; x += step) {
        const p = at(x / W), y = p.y * H;
        g.fillStyle = body; g.fillRect(x, y, step + 0.5, H - y);
        if (!p.d) continue;
        if (p.side > 0) {
          const yc = Math.max(y, crestY(p) * H);
          g.fillStyle = darkCss; g.fillRect(x, y, step + 0.5, yc - y);
          g.fillStyle = litCss; g.fillRect(x, yc, step + 0.5, H - yc);
          g.fillStyle = crest; g.fillRect(x, yc - k, step + 0.5, (1.5 + i * 0.5) * k);
        } else {
          g.fillStyle = litCss; g.fillRect(x, y, step + 0.5, H - y);
        }
      }
      // Shade toward the base, keeping only what is already painted.
      g.globalCompositeOperation = 'source-atop';
      const sh = g.createLinearGradient(0, (base - amp * 1.2) * H, 0, Math.min(1.1, base + 0.08) * H);
      sh.addColorStop(0, 'rgba(0,0,10,0)'); sh.addColorStop(1, 'rgba(0,0,10,.55)');
      g.fillStyle = sh; g.fillRect(0, 0, W, H);
      // Wind ripples: profile-following lines across the windward faces.
      g.strokeStyle = dark; g.lineWidth = 1.5 * k; g.globalAlpha = 0.35;
      for (let m = 1; m < 14; m++) {
        g.beginPath();
        for (let x = 0; x <= W; x += 6 * k) {
          const p = at(x / W), y = p.y * H + m * (6 + i * 3) * k + 3 * k * Math.sin(x * 0.02 + m);
          if (p.side < 0) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = crest;
      for (let x = 0; x < W; x += step) {
        const p = at(x / W);
        if (!p.d) continue;
        if (Math.abs(p.dx) < 0.006) g.fillRect(x, p.y * H, step + 0.5, (2 + i) * k);
      }
    });
    return { layer, ds, at, laps: Math.max(0, i - 1), i };
  });

  const crests = [];
  for (const L of layers.slice(3)) for (const d of L.ds) crests.push({ L, d, parts: Array.from({ length: 40 }, () => ({ o: r(), m: Math.max(1, Math.round(loop * (0.4 + r() * 0.4))), len: (40 + r() * 120) * k, drop: (10 + r() * 40) * k })) });

  return {
    sky, layers, crests, k, moonLeft,
    stars: upTo(120, () => ({ x: r() * W, y: r() * 0.55 * H, b: 0.3 + r() * 0.7, s: r() < 0.15 ? 3 : 2 })),
    shoot: { u0: 0.2 + r() * 0.5, x: (0.2 + r() * 0.5) * W, y: (0.06 + r() * 0.15) * H, dx: (r() < 0.5 ? -1 : 1) * 0.35 * W, dy: 0.12 * H },
  };
}

function drawDesert(u) {
  const g = sctx, D = dunes, W = GW, H = GH, k = D.k, step = Math.floor(u * cfg.loop * 3);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  blit(g, D.sky);

  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff';
  D.stars.forEach((s, i) => {
    g.globalAlpha = s.b * (hash(i, step) < 0.25 ? 0.25 : 1);
    g.fillRect(s.x, s.y, s.s * k + 0.5, s.s * k + 0.5);
  });
  // One shooting star per loop.
  const q = (u - D.shoot.u0) / 0.05;
  if (q >= 0 && q <= 1) {
    const hx = D.shoot.x + D.shoot.dx * q, hy = D.shoot.y + D.shoot.dy * q;
    const tail = g.createLinearGradient(hx, hy, hx - D.shoot.dx * 0.25, hy - D.shoot.dy * 0.25);
    tail.addColorStop(0, 'rgba(255,255,255,.9)'); tail.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 1 - q * 0.5; g.strokeStyle = tail; g.lineWidth = 3 * k;
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - D.shoot.dx * 0.25, hy - D.shoot.dy * 0.25); g.stroke();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  for (const L of D.layers) {
    const off = cfg.pan ? u * W * L.laps : 0;
    blitTile(g, L.layer, off);
    if (L.i < 3) continue;
    // Sand streaming off the crests of the nearest ridges, downwind.
    g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffe8d0';
    for (const c of D.crests) {
      if (c.L !== L) continue;
      const cx0 = ((((c.d.c * W - off) % W) + W) % W), cy = L.at(c.d.c).y * H;
      for (const p of c.parts) {
        const t = (p.o + u * p.m) % 1;
        g.globalAlpha = (1 - t) * 0.35;
        for (const cx of [cx0, cx0 - W]) g.fillRect(cx + t * p.len * (D.moonLeft ? 1 : -1), cy - Math.sin(t * Math.PI) * 8 * k + t * t * p.drop, 3 * k, 2 * k);
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}

SCENES.desert = {
  label: 'Dune Sea',
  gen(seed, loop) { dunes = genDesert(seed, loop); },
  draw: drawDesert,
};
