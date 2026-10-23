'use strict';
// Low-poly primitives for the "old-school 3D" scenes: cube, pyramid, cone and faceted
// sphere meshes, flat-shaded from one light with dark edge lines, drawn with true
// perspective in camera space (x right, y up, z forward from the camera).

const PRIM_LIGHT = (() => { const v = [-0.55, 0.75, -0.45], l = Math.hypot(...v); return v.map(c => c / l); })();

// Meshes are unit-sized and stand on y = 0. Faces list vertex indices counter-clockwise
// as seen from outside.
// Built at load time, before index.html defines TAU, so these use 2 * Math.PI.
const PRIMS = {
  cube: (() => {
    const v = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]];
    return { v, f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
  })(),
  pyramid: { v: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [0, 1, 0]], f: [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] },
  cone: (() => {
    const n = 12, v = [];
    for (let i = 0; i < n; i++) v.push([0.5 * Math.cos(((2 * Math.PI) * i) / n), 0, 0.5 * Math.sin(((2 * Math.PI) * i) / n)]);
    v.push([0, 1, 0]);
    const f = [Array.from({ length: n }, (_, i) => n - 1 - i)];
    for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, n]);
    return { v, f };
  })(),
  sphere: (() => {
    const lat = 6, lon = 12, v = [[0, 0, 0]];
    for (let a = 1; a < lat; a++) for (let b = 0; b < lon; b++) {
      const th = (Math.PI * a) / lat, ph = ((2 * Math.PI) * b) / lon;
      v.push([0.5 * Math.sin(th) * Math.cos(ph), 0.5 - 0.5 * Math.cos(th), 0.5 * Math.sin(th) * Math.sin(ph)]);
    }
    v.push([0, 1, 0]);
    const top = v.length - 1, at = (a, b) => 1 + (a - 1) * lon + (b % lon), f = [];
    for (let b = 0; b < lon; b++) f.push([0, at(1, b), at(1, b + 1)]);
    for (let a = 1; a < lat - 1; a++) for (let b = 0; b < lon; b++) f.push([at(a, b), at(a + 1, b), at(a + 1, b + 1), at(a, b + 1)]);
    for (let b = 0; b < lon; b++) f.push([at(lat - 1, b), top, at(lat - 1, b + 1)]);
    return { v, f };
  })(),
};
const PRIM_TYPES = ['cube', 'pyramid', 'cone', 'sphere'];
const PRIM_COLORS = ['#ff3a3a', '#ffd23a', '#3ad85a', '#ff4fd8', '#3ae0ff', '#f4f4f4', '#ff8a2a', '#8a5aff'];

// Draws one primitive. (bx, by, bz) is its base centre in camera space; w and h scale it,
// yaw spins it about its vertical axis; hz is the horizon row and F the focal scale.
function drawPrim(g, type, bx, by, bz, w, h, yaw, color, hz, F, alpha, k) {
  const m = PRIMS[type], cs = Math.cos(yaw), sn = Math.sin(yaw), c = hexRgb(color);
  const P = m.v.map(([x, y, z]) => {
    const rx = (x * cs - z * sn) * w, rz = (x * sn + z * cs) * w, cx = bx + rx, cy = by + y * h, cz = bz + rz;
    const s = cz > 1 ? (DRIVE.DEPTH * F) / cz : 0;
    return [cx, cy, cz, GW / 2 + cx * s, hz - cy * s];
  });
  if (P.some(p => p[2] <= 1)) return;
  // The shapes are convex, so a face's outward normal points away from the mesh centre.
  const ctr = [0, 1, 2].map(i => P.reduce((s, p) => s + p[i], 0) / P.length);
  const faces = [];
  for (const f of m.f) {
    const a = P[f[0]], b = P[f[1]], d = P[f[2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * (a[0] - ctr[0]) + ny * (a[1] - ctr[1]) + nz * (a[2] - ctr[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * a[0] + ny * a[1] + nz * a[2] >= 0) continue; // facing away from the camera
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const lit = 0.32 + 0.78 * Math.max(0, nx * PRIM_LIGHT[0] + ny * PRIM_LIGHT[1] + nz * PRIM_LIGHT[2]);
    faces.push({ f, z: f.reduce((s, i) => s + P[i][2], 0) / f.length, col: rgbHex(c[0] * lit, c[1] * lit, c[2] * lit) });
  }
  faces.sort((p, q) => q.z - p.z);
  g.globalAlpha = alpha; g.lineJoin = 'round'; g.strokeStyle = '#05050a'; g.lineWidth = Math.max(1, 2 * k);
  for (const fc of faces) {
    g.fillStyle = fc.col; g.beginPath();
    fc.f.forEach((i, j) => (j ? g.lineTo(P[i][3], P[i][4]) : g.moveTo(P[i][3], P[i][4])));
    g.closePath(); g.fill(); g.stroke();
  }
  g.globalAlpha = 1;
}

// Soft drop shadow on the ground plane, offset away from the light.
function primShadow(g, bx, by, bz, w, hz, F, alpha) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (TAU * i) / 16, x = bx + Math.cos(a) * w * 0.65 + w * 0.35, z = bz + Math.sin(a) * w * 0.55 + w * 0.25;
    if (z <= 1) return;
    const s = (DRIVE.DEPTH * F) / z;
    pts.push([GW / 2 + x * s, hz - by * s]);
  }
  g.globalAlpha = alpha; g.fillStyle = '#050a40'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  g.globalAlpha = 1;
}
