/**
 * planet-textures.ts — procedural surfaces for <st-planet-field>.
 *
 * threex.planets, the library issue #61 points at, gets its look from
 * photographic texture maps downloaded from planetpixelemporium. This repo
 * ships exactly one image asset, and the site's whole visual language is flat
 * and illustrated — a photoreal Jupiter would sit badly next to a hand-drawn
 * SVG UFO cursor. So every surface here is drawn into a canvas at startup from
 * the same `hi`/`lo` colour pair the Canvas 2D version used, and handed to
 * three.js as a CanvasTexture. No network, no assets, same palette.
 *
 * Everything is seeded through `rand()`, the same deterministic hash
 * `script.js` used for the starfield, so the sky and the surfaces are
 * identical on every visit. That was already deliberate (ANALYSIS.md §1) and
 * it stays deliberate.
 */

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** The colour and feature flags a surface needs. PlanetSpec extends this. */
export interface SurfaceSpec {
  /** Lit/high colour, `#rrggbb`. */
  hi: string;
  /** Shadowed/low colour, `#rrggbb`. */
  lo: string;
  /** Jupiter-style horizontal bands plus the Great Red Spot. */
  bands?: boolean;
  /** Continents and ice caps. */
  earth?: boolean;
  /** Varies the deterministic mottling between planets. */
  seed?: number;
}

type RGB = [number, number, number];

/**
 * The hash PRNG from script.js:19-22, unchanged. Not a good PRNG; it is the
 * one whose output the current sky is made of, and matching it is the point.
 */
export function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function parseHex(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = Number.parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function css(c: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable — cannot generate planet textures");
  return ctx;
}

/**
 * Draws a blob three times so it survives the horizontal seam. The texture
 * wraps in u, and a blob straddling u=0 is otherwise sliced in half.
 */
function wrappedBlob(
  ctx: CanvasRenderingContext2D,
  w: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  for (const dx of [-w, 0, w]) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The planet's surface, equirectangular.
 *
 * Note what this deliberately does NOT do: the old `drawPlanet` baked the
 * lighting into the texture as a radial gradient offset up-left
 * (script.js:214-221). Here the DirectionalLight produces that terminator for
 * real, so the map carries only surface — a latitude gradient for polar
 * darkening, plus mottling and per-planet features.
 */
export function surfaceTexture(spec: SurfaceSpec): CanvasTexture {
  const detailed = Boolean(spec.bands || spec.earth);
  const W = detailed ? 1024 : 512;
  const H = W / 2;
  const canvas = makeCanvas(W, H);
  const ctx = context2d(canvas);

  const hi = parseHex(spec.hi);
  const lo = parseHex(spec.lo);
  const seed = spec.seed ?? 1;

  // Latitude gradient: poles sit toward `lo`, the equatorial band toward `hi`.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, css(mix(lo, hi, 0.1)));
  base.addColorStop(0.35, css(mix(lo, hi, 0.85)));
  base.addColorStop(0.5, css(hi));
  base.addColorStop(0.65, css(mix(lo, hi, 0.85)));
  base.addColorStop(1, css(mix(lo, hi, 0.1)));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  if (spec.bands) {
    // Jupiter. The 2D version drew three flat rects (script.js:234-238); with a
    // real sphere the bands can run the whole way round instead.
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const y = t * H;
      const thickness = H * (0.035 + rand(seed + i * 3.1) * 0.05);
      const shade = i % 2 === 0 ? 0.25 : 0.72;
      ctx.fillStyle = css(mix(lo, hi, shade), 0.55);
      ctx.fillRect(0, y - thickness / 2, W, thickness);
    }
    // The Great Red Spot, kept at the same relative size as script.js:241-250.
    wrappedBlob(ctx, W, W * 0.62, H * 0.62, W * 0.075, H * 0.075, 0, "rgba(200, 90, 60, 0.8)");
    wrappedBlob(ctx, W, W * 0.62, H * 0.62, W * 0.045, H * 0.045, 0, "rgba(224, 120, 84, 0.6)");
  }

  if (spec.earth) {
    // Continents, replacing the two clipped ellipses at script.js:252-275.
    const land: RGB = [76, 156, 94];
    for (let i = 0; i < 9; i++) {
      const x = rand(seed + i * 5.7) * W;
      const y = H * (0.2 + rand(seed + i * 9.3) * 0.6);
      const rx = W * (0.05 + rand(seed + i * 2.9) * 0.09);
      const ry = H * (0.06 + rand(seed + i * 7.1) * 0.11);
      wrappedBlob(ctx, W, x, y, rx, ry, rand(seed + i) * Math.PI, css(land, 0.85));
      wrappedBlob(
        ctx,
        W,
        x + rx * 0.5,
        y + ry * 0.4,
        rx * 0.55,
        ry * 0.5,
        0,
        css(mix(land, [120, 180, 110], 0.6), 0.7),
      );
    }
    // Ice caps.
    const cap = ctx.createLinearGradient(0, 0, 0, H);
    cap.addColorStop(0, "rgba(255,255,255,0.9)");
    cap.addColorStop(0.12, "rgba(255,255,255,0)");
    cap.addColorStop(0.88, "rgba(255,255,255,0)");
    cap.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.fillStyle = cap;
    ctx.fillRect(0, 0, W, H);
  }

  // Mottling. Subtle on every planet — it is what stops a sphere reading as a
  // flat disc once it starts rotating.
  const spots = detailed ? 26 : 44;
  for (let i = 0; i < spots; i++) {
    const x = rand(seed * 3 + i * 1.7) * W;
    const y = rand(seed * 3 + i * 4.3) * H;
    const r = W * (0.012 + rand(seed * 3 + i * 6.1) * 0.05);
    const dark = rand(seed * 3 + i * 8.9) > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(dark ? lo : hi, 0.16));
    g.addColorStop(1, css(dark ? lo : hi, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  return tex;
}

/** Earth's cloud shell — a transparent map for a second, slightly larger sphere. */
export function cloudTexture(seed = 4): CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = makeCanvas(W, H);
  const ctx = context2d(canvas);

  for (let i = 0; i < 30; i++) {
    const x = rand(seed + i * 3.3) * W;
    const y = H * (0.12 + rand(seed + i * 5.1) * 0.76);
    const rx = W * (0.03 + rand(seed + i * 1.9) * 0.06);
    const ry = H * (0.02 + rand(seed + i * 7.7) * 0.035);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    for (const dx of [-W, 0, W]) {
      ctx.save();
      ctx.translate(x + dx, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-(x + dx), -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + dx, y, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  return tex;
}

/**
 * A ring, as concentric bands on a square texture.
 *
 * RingGeometry's UVs are planar rather than radial — `((x / radius) + 1) / 2`
 * — so a square canvas maps straight onto the annulus and concentric circles
 * drawn here come out as concentric ring bands. That is why this is a square
 * and not the 1D radial strip it looks like it should be.
 */
export function ringTexture(tint: string, seed = 9): CanvasTexture {
  const S = 512;
  const canvas = makeCanvas(S, S);
  const ctx = context2d(canvas);
  const c = parseHex(tint);
  const centre = S / 2;

  // Radii are fractions of the texture half-width, matching RingGeometry's
  // inner/outer radii being set to the same fractions of its outer radius.
  for (let i = 0; i < 46; i++) {
    const t = i / 45;
    const radius = centre * (0.7 + t * 0.3);
    const width = centre * 0.008;
    const gap = rand(seed + i * 2.3);
    const alpha = gap > 0.86 ? 0.05 : 0.35 + rand(seed + i * 5.9) * 0.45;
    ctx.strokeStyle = css(mix(c, [255, 255, 255], rand(seed + i * 1.3) * 0.35), alpha);
    ctx.lineWidth = width * (1 + rand(seed + i * 4.7));
    ctx.beginPath();
    ctx.arc(centre, centre, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * A shooting star's streak: opaque head at the right edge, fading to nothing at
 * the left, with a soft vertical falloff so the line has no hard rim.
 *
 * The 2D version stroked a linear-gradient line each frame (script.js:434-455).
 * As a texture on a rotated sprite the same shape costs one draw call and gets
 * the taper for free.
 */
export function streakTexture(): CanvasTexture {
  const W = 256;
  const H = 32;
  const canvas = makeCanvas(W, H);
  const ctx = context2d(canvas);

  const along = ctx.createLinearGradient(0, 0, W, 0);
  along.addColorStop(0, "rgba(180,220,255,0)");
  along.addColorStop(0.7, "rgba(180,220,255,0.45)");
  along.addColorStop(1, "rgba(255,255,255,0.95)");
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, W, H);

  const across = ctx.createLinearGradient(0, 0, 0, H);
  across.addColorStop(0, "rgba(0,0,0,1)");
  across.addColorStop(0.5, "rgba(0,0,0,0)");
  across.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** The soft halo each planet sits in — the r*2 radial glow of script.js:198-204. */
export function glowTexture(): CanvasTexture {
  const S = 128;
  const canvas = makeCanvas(S, S);
  const ctx = context2d(canvas);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0.30)");
  g.addColorStop(0.35, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
