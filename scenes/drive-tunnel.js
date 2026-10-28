'use strict';
// Neon Tunnel (3D): racing down a synthwave tunnel toward a striped sun. The tube is a ring of
// dark wall panels every few hundred units, edged in neon, twisting slowly and snaking left,
// right, up and down; pulses of light rush toward the camera along it, sparks streak past,
// and the camera banks into the curves.
// The tunnel's path is a sum of sines with whole periods over its length L, and the camera
// covers L a whole number of times per loop, so it loops seamlessly.

let dtun;

function genDriveTunnel(seed, loop) {
  let r = rng(seed * 2833 + 13);
  const W = GW, H = GH, k = W / 1920;
  const sparks = upTo(60, () => ({ a: r() * TAU, rad: 0.55 + r() * 0.4, z: r(), tint: r() < 0.5 ? '#ff6ae8' : '#6af0ff' }));

  // Everything below gets its own random sequence, so it stays put when Density changes.
  r = rng(seed * 2833 + 14);
  const L = 18000, D = 450, N = Math.round(L / D), sides = r() < 0.5 ? 6 : 8;
  const terms = amp => Array.from({ length: 3 }, (_, i) => ({ f: i + 1 + Math.floor(r() * 2), a: amp / (i + 1), p: r() }));
  const pathX = terms(650), pathY = terms(320);
  const palette = [['#ff3ad8', '#3af0ff'], ['#ff6a3a', '#ff3a8a'], ['#3aff9a', '#3aa8ff']][Math.floor(r() * 3)];
  const sky = paintLayer(g => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0a0220'); gr.addColorStop(0.5, '#2a0a4a'); gr.addColorStop(1, '#0a0220');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 160; i++) { g.globalAlpha = 0.2 + r() * 0.6; const s = (1 + r() * 1.5) * k; g.fillRect(r() * W, r() * H, s, s); }
    g.globalAlpha = 1;
  });
  dtun = {
    L, D, N, sides, pathX, pathY, palette, sparks, sky, k,
    passes: Math.max(1, Math.round(loop / 4)), twist: r() < 0.5 ? 1 : -1, pulses: 3, R: 1000,
  };
}

function drawDriveTunnel(u) {
  const g = sctx, T = dtun, W = GW, H = GH, k = T.k, L = T.L, D = T.D;
  const f = DRIVE.DEPTH * (W / 2), camZ = u * L * T.passes, NEAR = 40;
  const wave = (t, z) => t.reduce((s, q) => s + q.a * Math.sin(TAU * ((q.f * z) / L + q.p)), 0);
  const slope = (t, z) => t.reduce((s, q) => s + ((q.a * TAU * q.f) / L) * Math.cos(TAU * ((q.f * z) / L + q.p)), 0);
  const bend = (t, z) => t.reduce((s, q) => s - q.a * ((TAU * q.f) / L) ** 2 * Math.sin(TAU * ((q.f * z) / L + q.p)), 0);
  const cx0 = wave(T.pathX, camZ), cy0 = wave(T.pathY, camZ), sx0 = slope(T.pathX, camZ), sy0 = slope(T.pathY, camZ);
  // The camera looks along the tunnel, so each ring's centre is measured off that line.
  const centre = dz => { const z = camZ + dz; return [wave(T.pathX, z) - cx0 - sx0 * dz, wave(T.pathY, z) - cy0 - sy0 * dz]; };
  const roll = clamp(-bend(T.pathX, camZ) * 900, -0.35, 0.35);

  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.save(); g.translate(W / 2, H / 2); g.rotate(roll); g.scale(1.25, 1.25); g.translate(-W / 2, -H / 2);
  g.drawImage(T.sky, 0, 0, W, H);
  g.restore();
  g.save(); g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);

  // Rings ahead of the camera, far to near. Ring j is fixed in the world (index j mod N), so
  // colours, twist and pulses travel with the tunnel.
  const base = Math.floor(camZ / D) + 1, rings = [];
  const END = L * 0.55;  // the tunnel's open end, with the sun beyond it
  for (let n = 0; n < T.N; n++) {
    const j = base + n, dz = j * D - camZ;
    if (dz < NEAR || dz > END) continue;
    const [ox, oy] = centre(dz), id = ((j % T.N) + T.N) % T.N;
    const a0 = (TAU * id) / T.N * T.twist + Math.PI / T.sides;
    const pts = Array.from({ length: T.sides }, (_, i) => {
      const a = a0 + (TAU * i) / T.sides;
      return [W / 2 + ((ox + Math.cos(a) * T.R) * f) / dz, H / 2 + ((oy + Math.sin(a) * T.R) * f) / dz];
    });
    const pulse = Math.pow(0.5 + 0.5 * Math.cos(TAU * ((id * T.pulses) / T.N + u * T.passes * T.pulses * 2)), 6);
    rings.push({ id, dz, pts, ox, oy, pulse, fade: clamp((END - dz) / (L * 0.22)) });
  }

  // The sun, seen down the tunnel past its far end.
  {
    const SZ = END + D, [ox, oy] = centre(SZ), sx = W / 2 + (ox * f) / SZ, sy = H / 2 + (oy * f) / SZ, sr = 0.13 * H;
    g.globalCompositeOperation = 'lighter'; glow(g, sx, sy, sr * 2.6, T.palette[0], 0.45); g.globalCompositeOperation = 'source-over';
    g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.clip();
    const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr);
    sg.addColorStop(0, '#fff27a'); sg.addColorStop(0.5, '#ff8a3a'); sg.addColorStop(1, T.palette[0]);
    g.fillStyle = sg; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    g.fillStyle = '#1a0630';
    for (let i = 0; i < 7; i++) { const t = (i + u * 4) % 7 / 7, y = sy + t * sr, h = (1.5 + t * 7) * k; g.fillRect(sx - sr, y, sr * 2, h); }
    g.restore();
  }

  // Far to near, each stretch of tunnel paints over everything beyond it: the ring at its far
  // end, then its wall panels (shaded by which way they face) and rails, so the walls of a
  // bend hide the tunnel behind them.
  const neon = rg => {
    const col = T.palette[rg.id % 2], w = (f / rg.dz) * 14 * k;
    g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
    for (const [lw, al] of [[3.2, 0.14], [1.4, 0.4], [0.5, 1]]) {
      g.strokeStyle = lw < 1 ? '#ffffff' : col; g.globalAlpha = clamp(rg.fade * al * (0.35 + 0.65 * rg.pulse + (lw < 1 ? 0 : 0.2)));
      g.lineWidth = Math.max(1, w * lw);
      g.beginPath(); rg.pts.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  };
  if (rings.length) neon(rings[rings.length - 1]);
  for (let i = rings.length - 2; i >= 0; i--) {
    const a = rings[i], b = rings[i + 1], lit = 0.35 + 0.65 * a.fade;
    for (let s = 0; s < T.sides; s++) {
      const s2 = (s + 1) % T.sides, ang = (TAU * (s + 0.5)) / T.sides, shade = 0.5 + 0.5 * Math.sin(ang + 0.6);
      g.fillStyle = rgbHex((0.05 + 0.08 * shade) * lit, (0.02 + 0.03 * shade) * lit, (0.1 + 0.12 * shade) * lit);
      g.beginPath(); g.moveTo(a.pts[s][0], a.pts[s][1]); g.lineTo(a.pts[s2][0], a.pts[s2][1]); g.lineTo(b.pts[s2][0], b.pts[s2][1]); g.lineTo(b.pts[s][0], b.pts[s][1]); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = T.palette[1]; g.globalAlpha = 0.3 * b.fade; g.lineWidth = Math.min(8 * k, Math.max(1, (6 * k * f) / b.dz));
    g.beginPath();
    for (let s = 0; s < T.sides; s++) { g.moveTo(a.pts[s][0], a.pts[s][1]); g.lineTo(b.pts[s][0], b.pts[s][1]); }
    g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    neon(a);
  }

  g.globalCompositeOperation = 'lighter';
  // Sparks streaking past close to the walls.
  g.lineCap = 'round';
  for (const s of T.sparks) {
    const dz = ((((s.z * L - camZ * 2) % L) + L) % L) + NEAR;  // twice the camera's speed
    if (dz > L * 0.6 || dz < 250) continue;
    const [ox, oy] = centre(dz), x = ox + Math.cos(s.a) * T.R * s.rad, y = oy + Math.sin(s.a) * T.R * s.rad, dz0 = dz + 700;
    const [ox0, oy0] = centre(dz0), x0 = ox0 + Math.cos(s.a) * T.R * s.rad, y0 = oy0 + Math.sin(s.a) * T.R * s.rad;
    g.strokeStyle = s.tint; g.globalAlpha = clamp(1 - dz / (L * 0.6)); g.lineWidth = Math.min(6 * k, Math.max(1, (f / dz) * 10 * k));
    g.beginPath(); g.moveTo(W / 2 + (x0 * f) / dz0, H / 2 + (y0 * f) / dz0); g.lineTo(W / 2 + (x * f) / dz, H / 2 + (y * f) / dz); g.stroke();
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.restore();
}

SCENES.dtunnel = { group: '3D drive', label: 'Neon Tunnel', gen(seed, loop) { genDriveTunnel(seed, loop); }, draw: drawDriveTunnel };
