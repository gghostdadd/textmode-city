'use strict';
// Scene registry and shared drawing helpers.
// Each scene registers SCENES[key] = { label, gen(seed, loop), draw(u) }.
//   gen runs on every rebuild, after the grid and sample canvas are sized (so it may paint
//   static layers at sample resolution). draw runs every frame with loop phase u in 0..1 and
//   paints into sctx in output-pixel space (GW x GH).
// Rule for every scene: anything that moves must complete a whole number of cycles per loop.
//
// Uses globals from index.html: cfg, cols, rows, cw, ch, GW, GH, SW, SH, sc, sctx, MODES,
// and the helpers rng, hash, mixCss, clamp, TAU.

const SCENES = {};

function glow(g, x, y, r, color, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}

// Draws a layer item at every repeat of a horizontally periodic layer (period P cells,
// scrolled by `off` cells), skipping copies that are fully off-screen.
function periodic(P, off, c0, wC, fn) {
  const s = (((c0 - off) % P) + P) % P;
  for (let x = s - P; x < cols + 2; x += P) if (x + wC + 3 > 0) fn(x);
}

// Paints a static layer once into its own canvas at sample resolution, in output-pixel space.
function paintLayer(fn) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const g = c.getContext('2d');
  g.setTransform(SW / GW, 0, 0, SH / GH, 0, 0);
  fn(g);
  return c;
}
function blit(g, layer) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, 0, 0); g.restore();
}
// Blits a layer that tiles every GW output pixels, scrolled left by `off` output pixels.
function blitTile(g, layer, off) {
  const d = ((((off % GW) + GW) % GW) * SW) / GW;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(layer, -d, 0); g.drawImage(layer, SW - d, 0);
  g.restore();
}

// Density (the panel's Density slider, 0.25–3) scales how many objects a scene places.
// Both helpers always draw the same random numbers whatever the density, so turning it up
// adds objects to the same layout instead of reshuffling it.
// place: an item that appears with probability p (scaled by density); returns it or null.
function place(r, p, make) { const roll = r(), it = make(); return roll < p * cfg.density ? it : null; }
// upTo: `base` items at density 1, scaled by density (up to 3×).
function upTo(base, make) { return Array.from({ length: Math.ceil(base * 3) }, make).slice(0, Math.round(base * cfg.density)); }
