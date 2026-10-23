'use strict';
// Neon Avenue (3D drive): cruising down the middle of a city street at night. Buildings
// line both sides as 3D boxes with lit windows and neon roof trim; blade signs glow, street
// lamps pool light on the road, slower traffic in the next lane, oncoming headlights, and
// flying cars overhead. A skyline and a ringed planet sit on the horizon.

let dcity;

function genDriveCity(seed, loop) {
  let r = rng(seed * 3301 + 9);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 36, curve: 1.4, hill: 0.04 });
  const pick = a => a[Math.floor(r() * a.length)];
  const TINT = ['#bff4ff', '#38e8ff', '#ff4fd8', '#ffbe55', '#bff4ff', '#fff0c8'];
  const NEONS = ['#22eaff', '#ff2a9a', '#9d5cff', '#7dff5a', '#ffbe30'];

  // Buildings on both sides, back to back with alleys between some; the last one on each
  // side is trimmed so the row meets itself where the track wraps. Density sets how often
  // and how wide the alleys are, how deep each block is and how tall the towers get; above
  // 1 a second, taller row rises behind the first.
  const D = cfg.density, deep = D > 1 ? 1 / Math.sqrt(D) : 1, tall = D > 1 ? 1 + (D - 1) * 0.35 : 0.65 + 0.35 * D;
  const row = (rr, side, o) => {
    for (let i = 0; i < T.n;) {
      if (rr() < o.alley) { i += Math.max(1, Math.round((1 + rr() * 2) * o.gap)); continue; }
      const d = Math.min(T.n - i, Math.max(2, Math.round((3 + Math.floor(rr() * 6)) * deep))), h = (2500 + rr() ** 1.5 * 11000) * tall * o.hs;
      const it = {
        type: 'bldg', side, d, h, xin: o.xin + rr() * 0.15, xout: o.xin + 1.6 + rr() * 2, fh: 340, id: (i * 4 + (side > 0 ? 1 : 0) + o.idOff) | 0,
        tint: pick(TINT), accent: pick(TINT), trim: rr() < 0.5 ? pick(NEONS) : null, win: rr(), behind: o.behind,
      };
      T.segs[i].items.push(it);
      if (!o.behind) { const sg = place(rr, 0.3, () => ({ type: 'sign', side, x: side * 1.5, y0: 900 + rr() * 1800, h: 900 + rr() * 1400, w: 220, color: pick(NEONS), id: i })); if (sg) T.segs[i + Math.floor(d / 2)].items.push(sg); }
      i += d;
    }
  };
  if (D > 1) {
    const rb = rng(seed * 3301 + 77);
    for (const side of [-1, 1]) row(rb, side, { alley: clamp(1 - (D - 1) * 0.6, 0.15, 0.85), gap: 2, xin: 5.2, hs: 1.6, idOff: 2, behind: true });
  }
  for (const side of [-1, 1]) row(r, side, { alley: Math.min(0.8, 0.18 / D), gap: D < 1 ? 1 / D : 1, xin: 1.55, hs: 1, idOff: 0, behind: false });
  for (let i = 0; i < T.n; i += 10) for (const side of [-1, 1]) T.segs[(i + (side > 0 ? 5 : 0)) % T.n].items.push({ type: 'lamp', side, x: side * 1.18 });

  // Traffic and the sky (planet, skyline) get their own random sequence, so they stay put
  // when Density changes the buildings.
  r = rng(seed * 3301 + 10);
  const traffic = [
    ...upTo(5, () => ({ x: 0.72, laps: 0, z0: r(), color: pick(['#2a2a3a', '#c8c0d0', '#7a1a2a', '#1a3a5a']), front: false })),
    ...upTo(6, () => ({ x: -0.3 - r() * 0.45, laps: -1, z0: r(), color: pick(['#2a2a3a', '#c8c0d0', '#3a3a4a']), front: true })),
    ...upTo(8, () => ({ x: (r() - 0.5) * 3, laps: -2, z0: r(), fly: 2600 + r() * 3600, color: pick(NEONS) })),
  ];

  // Backdrop: sky, planet and a far skyline that tiles one screen width and slides with the curves.
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.5);
    gr.addColorStop(0, '#02030a'); gr.addColorStop(0.6, '#140b30'); gr.addColorStop(1, '#5a1a5e');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const px = (0.25 + r() * 0.5) * W, py = 0.17 * H, pr = 0.09 * H;
    g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
    ['#3d1d64', '#5a2a78', '#7c3a80', '#a2508a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(px - pr, py - pr + (i * 2 * pr) / 4, pr * 2, (2 * pr) / 4 + 1); });
    g.restore();
    g.strokeStyle = '#d6a0e0'; g.lineWidth = pr * 0.07; g.globalAlpha = 0.7;
    g.beginPath(); g.ellipse(px, py, pr * 2, pr * 0.4, -0.25, 0, TAU); g.stroke(); g.globalAlpha = 1;
  });
  const skyline = paintLayer(g => {
    for (let x = 0; x < W;) {
      const w = (0.02 + r() * 0.05) * W, h = (0.05 + r() * 0.2) * H;
      g.fillStyle = '#1a1438'; g.fillRect(x, H * 0.5 - h, w + 1, h);
      g.fillStyle = '#3a2a70';
      for (let y = H * 0.5 - h + 6 * k; y < H * 0.5; y += 9 * k) if (r() < 0.4) g.fillRect(x + 2, y, w - 4, 2 * k);
      x += w + r() * 0.01 * W;
    }
  });

  dcity = { T, traffic, sky, skyline, k };
}

function drawDriveCity(u) {
  const g = sctx, C = dcity, W = GW, H = GH, k = C.k, step = Math.floor(u * cfg.loop * 2);
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, C.T, u, {
    horizon: 0.5, camH: 1100, camX: 0.25, traffic: C.traffic, back: 9,
    sky(g, u, bg) { blit(g, C.sky); blitTile(g, C.skyline, bg * W * 0.004); },
    segment(g, a, b) {
      const alt = Math.floor(a.s.i / 4) % 2;
      dStrip(g, a, b, -40, 40, '#08080f');
      dStrip(g, a, b, -1.55, 1.55, alt ? '#262434' : '#22202e');
      dStrip(g, a, b, -1.04, 1.04, '#3a3850');
      dStrip(g, a, b, -1, 1, alt ? '#15141f' : '#121119');
      dStrip(g, a, b, -0.03, -0.01, '#ffbe30'); dStrip(g, a, b, 0.01, 0.03, '#ffbe30');
      if (alt) { dStrip(g, a, b, -0.52, -0.49, '#c8c8d8'); dStrip(g, a, b, 0.49, 0.52, '#c8c8d8'); }
    },
    item(g, it, pos, vis, n, u) {
      g.globalAlpha = pos.fade;
      if (it.type === 'bldg') {
        const A = vis[n], B = vis[Math.min(n + it.d, DRIVE.DRAW)], s = it.side;
        dWall(g, A, B, s * it.xin, 0, it.h, '#0c0b1c');
        const nearF = A.K * it.fh > 2.2;
        if (nearF) {
          for (let j = n; j < Math.min(n + it.d, DRIVE.DRAW); j++) {
            const P = vis[j], Q = vis[j + 1];
            for (let fl = 1; fl * it.fh < it.h - it.fh * 0.5; fl++) {
              const id = it.id * 4096 + (j - n + (it.off || 0)) * 64 + fl;
              let on = hash(id, 1) < (it.win < 0.5 ? 0.5 : 0.3);
              if (hash(id, 2) < 0.05 && hash(id, 100 + step) < 0.2) on = !on;
              const c0 = dLerp(P, Q, 0.2), c1 = dLerp(P, Q, 0.8), y0 = fl * it.fh, y1 = y0 + it.fh * 0.55;
              g.fillStyle = on ? (hash(id, 3) < 0.15 ? it.accent : it.tint) : '#17152c';
              g.beginPath();
              g.moveTo(c0.X + s * it.xin * c0.R, c0.Y - y0 * c0.K); g.lineTo(c1.X + s * it.xin * c1.R, c1.Y - y0 * c1.K);
              g.lineTo(c1.X + s * it.xin * c1.R, c1.Y - y1 * c1.K); g.lineTo(c0.X + s * it.xin * c0.R, c0.Y - y1 * c0.K);
              g.fill();
            }
          }
        } else {
          g.globalAlpha = pos.fade * 0.5; dWall(g, A, B, s * it.xin, 0, it.h * 0.9, '#2a2440'); g.globalAlpha = pos.fade;
        }
        // Front face, seen across alleys and at the start of each block.
        const x0 = A.X + s * it.xin * A.R, x1 = A.X + s * it.xout * A.R, top = A.Y - it.h * A.K;
        if (!it.cut) g.fillStyle = '#14122a', g.fillRect(Math.min(x0, x1), top, Math.abs(x1 - x0), A.Y - top);
        if (nearF && !it.cut) {
          g.fillStyle = it.tint;
          for (let fl = 1; fl * it.fh < it.h - it.fh * 0.5; fl++) for (let c = 0.25; c < it.xout - it.xin - 0.15; c += 0.45) {
            if (hash(it.id * 97 + fl, Math.round(c * 10)) > 0.4) continue;
            const wx = A.X + s * (it.xin + c) * A.R;
            g.fillRect(Math.min(wx, wx + s * 0.22 * A.R), A.Y - (fl * it.fh + it.fh * 0.55) * A.K, 0.22 * A.R, it.fh * 0.55 * A.K);
          }
        }
        if (it.trim) {
          g.globalCompositeOperation = 'lighter'; g.strokeStyle = it.trim; g.lineWidth = Math.max(1.5, 3 * k);
          g.beginPath(); g.moveTo(B.X + s * it.xin * B.R, B.Y - it.h * B.K); g.lineTo(x0, top); if (!it.cut) g.lineTo(x1, top); g.stroke();
          g.globalCompositeOperation = 'source-over';
        }
      } else if (it.type === 'sign') {
        const x = pos.X + it.x * pos.R, top = pos.Y - (it.y0 + it.h) * pos.K, w = it.w * pos.K, h = it.h * pos.K;
        g.fillStyle = '#070720'; g.fillRect(x - w / 2, top, w, h);
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = it.color; g.fillStyle = it.color; g.lineWidth = Math.max(1, w * 0.12);
        g.strokeRect(x - w / 2, top, w, h);
        const chase = Math.floor(u * cfg.loop * 4) % 4;
        for (let i = 0; i < 4; i++) { g.globalAlpha = pos.fade * (i === chase ? 1 : 0.3); g.fillRect(x - w * 0.3, top + (h * (i + 0.15)) / 4, w * 0.6, (h * 0.6) / 4); }
        glow(g, x, top + h / 2, h * 0.6, it.color, 0.25 * pos.fade);
      } else if (it.type === 'lamp') {
        const x = pos.X + it.x * pos.R, top = pos.Y - 2600 * pos.K, hx = x - it.side * 0.28 * pos.R;
        g.fillStyle = '#1a1826'; g.fillRect(x - 30 * pos.K, top, 60 * pos.K, 2600 * pos.K);
        g.fillRect(Math.min(x, hx), top, Math.abs(hx - x), 40 * pos.K);
        g.globalCompositeOperation = 'lighter';
        glow(g, hx, top + 60 * pos.K, 380 * pos.K, '#ffcf7a', 0.9 * pos.fade);
        g.save(); g.translate(hx, pos.Y); g.scale(1, 0.22); glow(g, 0, 0, 900 * pos.K, '#ffb860', 0.35 * pos.fade); g.restore();
      }
    },
    car(g, c, pos) {
      if (c.fly) {
        const x = pos.X + c.x * pos.R, y = pos.Y - c.fly * pos.K, s = pos.K;
        g.globalCompositeOperation = 'lighter';
        glow(g, x, y, 260 * s, c.color, pos.fade * 0.8); glow(g, x, y, 60 * s, '#ffffff', pos.fade);
        g.globalAlpha = pos.fade * 0.5; g.fillStyle = c.color; g.fillRect(x - 420 * s, y - 15 * s, 840 * s, 30 * s);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      } else dCar(g, pos, c.x, c.color, c.front, pos.fade);
    },
  });
}

SCENES.dcity = { group: '3D drive', label: 'Neon Avenue', gen(seed, loop) { genDriveCity(seed, loop); }, draw: drawDriveCity };
