'use strict';
// Desert Night (3D drive): a lone two-lane road rolling over moonlit dunes. Big dunes with
// shadowed slip faces rise on both sides, roadside reflectors glint, the Milky Way arcs
// overhead, a shooting star crosses once per loop, and a few headlights come the other way.

let ddes;

function genDriveDesert(seed, loop) {
  let r = rng(seed * 2671 + 13);
  const W = GW, H = GH, k = W / 1920;
  const T = makeTrack(r, loop, { speed: 36, curve: 1.4, hill: 0.1 });
  const moonLeft = r() < 0.5;

  // Dune sprites: a rounded hump with a crest line running down the slip side, which is in
  // shadow; the windward side catches the moon.
  const dune = (w, hgt) => dSprite(1000, 320, w, (g, cw, ch) => {
    const crest = 0.35 + r() * 0.3, top = ch * (1 - hgt);
    const y = x => { const t = x / cw; return t < crest ? ch - (ch - top) * Math.sin((Math.PI / 2) * (t / crest)) ** 1.6 : ch - (ch - top) * Math.cos((Math.PI / 2) * ((t - crest) / (1 - crest))) ** 0.7; };
    const lit = g.createLinearGradient(0, top, 0, ch);
    lit.addColorStop(0, '#9088c0'); lit.addColorStop(1, '#4a4470');
    g.fillStyle = lit; g.beginPath(); g.moveTo(0, ch);
    for (let x = 0; x <= cw; x += 4) g.lineTo(x, y(x));
    g.lineTo(cw, ch); g.fill();
    g.fillStyle = '#0e0c20'; g.beginPath(); g.moveTo(crest * cw, y(crest * cw));
    for (let x = crest * cw; x <= cw; x += 4) g.lineTo(x, y(x));
    g.lineTo(cw, ch); g.lineTo(crest * cw + (cw - crest * cw) * 0.15, ch); g.closePath(); g.fill();
    g.strokeStyle = '#e0dcff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(crest * cw - cw * 0.05, y(crest * cw - cw * 0.05)); g.lineTo(crest * cw, y(crest * cw)); g.lineTo(crest * cw + (cw - crest * cw) * 0.15, ch); g.stroke();
    g.strokeStyle = '#2a2648'; g.lineWidth = 2; g.globalAlpha = 0.5;
    for (let m = 1; m < 8; m++) { g.beginPath(); for (let x = 0; x < crest * cw; x += 8) { const yy = y(x) + m * 16 + 4 * Math.sin(x * 0.03 + m); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    g.globalAlpha = 1;
  });
  const dunes = [dune(16000, 0.55), dune(22000, 0.7), dune(12000, 0.45), dune(28000, 0.8)];

  for (let i = 0; i < T.n; i++) {
    const s = T.segs[i];
    for (const side of [-1, 1]) { const it = place(r, 0.3, () => ({ type: 'dune', x: side * (3 + r() ** 1.2 * 16), v: Math.floor(r() * 4), sc: 0.45 + r() * 0.6, flip: !moonLeft, f: r() })); if (it) s.items.push(it); }
    if (i % 5 === 0) for (const side of [-1, 1]) s.items.push({ type: 'post', x: side * 1.12 });
  }
  // Everything below gets its own random sequence, so it stays put when Density changes
  // how many roadside objects were placed above.
  r = rng(seed * 2671 + 14);
  const traffic = upTo(2, () => ({ x: -0.5, laps: -1, z0: r(), color: '#2a2a3a', front: true }));

  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.5);
    gr.addColorStop(0, '#01020a'); gr.addColorStop(0.7, '#060a24'); gr.addColorStop(1, '#1e2048');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.5 + 2);
    g.fillStyle = '#14122a'; g.fillRect(0, H * 0.5, W, H * 0.5);
    const ax = 0, ay = 0.45 * H, bx = W, by = 0.0, len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len, ang = Math.atan2(by - ay, bx - ax);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 200; i++) {
      const t = r(), o = (r() + r() + r() - 1.5) * 0.07 * H;
      g.globalAlpha = 0.035; g.fillStyle = r() < 0.7 ? '#8a8ac8' : '#c8a0c0';
      g.beginPath(); g.ellipse(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o, (30 + r() * 60) * k, (12 + r() * 20) * k, ang, 0, TAU); g.fill();
    }
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 1100; i++) {
      const t = r(), o = (r() + r() + r() - 1.5) * 0.08 * H;
      g.globalAlpha = 0.15 + r() * 0.5; g.fillRect(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o, 1.5 * k + 0.5, 1.5 * k + 0.5);
    }
    for (let i = 0; i < 160; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.fillRect(r() * W, r() * 0.48 * H, 2 * k, 2 * k); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const mx = (moonLeft ? 0.2 : 0.8) * W, my = 0.14 * H, mr = 0.035 * H;
    glow(g, mx, my, mr * 5, '#c8d0ff', 0.18);
    g.fillStyle = '#f4f2e6'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
  });
  const far = paintLayer(g => {
    g.fillStyle = '#24203e'; g.beginPath(); g.moveTo(0, H * 0.5);
    for (let x = 0; x <= 1.0001; x += 0.004) g.lineTo(x * W, H * (0.5 - 0.02 - 0.015 * Math.sin(TAU * (x * 3 + 0.1)) - 0.008 * Math.sin(TAU * x * 8)));
    g.lineTo(W, H * 0.5); g.fill();
  });

  ddes = { T, dunes, traffic, sky, far, k, shoot: { u0: 0.2 + r() * 0.5, x: (0.2 + r() * 0.5) * W, y: (0.05 + r() * 0.12) * H, dx: (r() < 0.5 ? -1 : 1) * 0.3 * W, dy: 0.1 * H } };
}

function drawDriveDesert(u) {
  const g = sctx, D = ddes, W = GW, k = D.k;
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  driveFrame(g, D.T, u, {
    horizon: 0.5, camH: 1000, camX: 0.4, traffic: D.traffic,
    sky(g, u, bg) {
      blit(g, D.sky);
      const q = (u - D.shoot.u0) / 0.05;
      if (q >= 0 && q <= 1) {
        const hx = D.shoot.x + D.shoot.dx * q, hy = D.shoot.y + D.shoot.dy * q;
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffffff'; g.lineWidth = 3 * k; g.globalAlpha = 1 - q * 0.5;
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - D.shoot.dx * 0.2, hy - D.shoot.dy * 0.2); g.stroke();
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      blitTile(g, D.far, bg * W * 0.004);
    },
    segment(g, a, b) {
      const alt = Math.floor(a.s.i / 4) % 2;
      dStrip(g, a, b, -60, 60, alt ? '#2e2a48' : '#2a2642');
      dStrip(g, a, b, -1, 1, alt ? '#24222e' : '#22202a');
      if (alt) dStrip(g, a, b, -0.02, 0.02, '#d8c890');
      dStrip(g, a, b, -1.0, -0.97, '#8a8aa0'); dStrip(g, a, b, 0.97, 1.0, '#8a8aa0');
    },
    item(g, it, pos) {
      const X = pos.X + it.x * pos.R;
      // Dunes stand by their inner edge so they spread away from the road, never across it.
      if (it.type === 'dune') { const spr = D.dunes[it.v]; dDraw(g, spr, X + Math.sign(it.x) * (spr.wW * pos.K * it.sc) / 2, pos.Y + 200 * pos.K, pos.K, pos.fade, it.flip, it.sc); }
      else if (it.type === 'post') {
        g.globalAlpha = pos.fade; g.fillStyle = '#6a6a7a'; g.fillRect(X - 20 * pos.K, pos.Y - 320 * pos.K, 40 * pos.K, 320 * pos.K);
        g.globalCompositeOperation = 'lighter'; glow(g, X, pos.Y - 290 * pos.K, 60 * pos.K, '#ffb040', pos.fade);
      }
    },
    car(g, c, pos) { dCar(g, pos, c.x, c.color, c.front, pos.fade); },
  });
}

SCENES.ddesert = { group: '3D drive', label: 'Desert Night', gen(seed, loop) { genDriveDesert(seed, loop); }, draw: drawDriveDesert };
