import { drawPlanet } from "./starfield.js";

export default function createIssBackground(opts = {}) {
  let baseW = opts.BASE_W || 900;
  let baseH = opts.BASE_H || 900;
  let staticCanvas = null;
  let staticCtx = null;

  // deterministic crater seeds so craters don't animate
  const craterSeed = [
    { ax: 0.28, ay: -0.14, s: 0.12 },
    { ax: -0.18, ay: 0.06, s: 0.09 },
    { ax: 0.09, ay: 0.22, s: 0.07 },
    { ax: -0.35, ay: -0.02, s: 0.05 },
    { ax: 0.42, ay: 0.06, s: 0.06 },
  ];

  function buildStatic() {
    staticCanvas = document.createElement("canvas");
    staticCanvas.width = baseW;
    staticCanvas.height = baseH;
    staticCtx = staticCanvas.getContext("2d");

    const octx = staticCtx;

    // sky gradient
    const g = octx.createLinearGradient(0, 0, 0, baseH);
    g.addColorStop(0, "#050617");
    g.addColorStop(0.6, "#071025");
    g.addColorStop(1, "#02030a");
    octx.fillStyle = g;
    octx.fillRect(0, 0, baseW, baseH);

    // Earth - use shared drawPlanet to match frontpage style
    const earthRadius = baseW * 0.42;
    const earthX = -earthRadius * 0.15;
    const earthY = baseH - earthRadius * 0.52;

    const p = { earth: true, hi: "#4a9fd8", lo: "#2d5a7a" };
    // drawPlanet expects radius in pixels and handles gradient + land/cloud shapes
    drawPlanet(octx, p, earthX, earthY, earthRadius);

    // subtle terminator shadow overlay (multiply)
    octx.save();
    octx.globalCompositeOperation = "multiply";
    const shadowGrad = octx.createLinearGradient(
      earthX - earthRadius,
      earthY - earthRadius,
      earthX + earthRadius,
      earthY + earthRadius,
    );
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.0)");
    shadowGrad.addColorStop(0.6, "rgba(0,0,0,0.32)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0.56)");
    octx.fillStyle = shadowGrad;
    octx.beginPath();
    octx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
    octx.fill();
    octx.restore();

    // Moon - static with deterministic craters
    const moonRadius = baseW * 0.07;
    const moonX = baseW * 0.78;
    const moonY = baseH * 0.18;
    const mg = octx.createRadialGradient(
      moonX - moonRadius * 0.15,
      moonY - moonRadius * 0.12,
      moonRadius * 0.08,
      moonX,
      moonY,
      moonRadius,
    );
    mg.addColorStop(0, "#f2f2f2");
    mg.addColorStop(1, "#cfcfcf");
    octx.beginPath();
    octx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    octx.fillStyle = mg;
    octx.fill();

    octx.fillStyle = "rgba(0,0,0,0.12)";
    for (const c of craterSeed) {
      const cx = moonX + c.ax * moonRadius;
      const cy = moonY + c.ay * moonRadius;
      octx.beginPath();
      octx.arc(cx, cy, moonRadius * c.s, 0, Math.PI * 2);
      octx.fill();
    }

    // small static starfield can be part of static (optional)
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * baseW;
      const sy = Math.random() * baseH;
      const sr = Math.random() * 1.2 + 0.2;
      octx.globalAlpha = 0.6;
      octx.beginPath();
      octx.fillStyle = "#fff";
      octx.arc(sx, sy, sr, 0, Math.PI * 2);
      octx.fill();
      octx.globalAlpha = 1;
    }
  }

  function init() {
    buildStatic();
  }

  function resize(w, h) {
    baseW = w || baseW;
    baseH = h || baseH;
    buildStatic();
  }

  // Draw the background to fill the full screen (canvas pixel dims)
  function drawFullscreen(ctx, screenW, screenH, ts) {
    if (!staticCanvas) buildStatic();
    // scale staticCanvas (virtual baseW/baseH) to screenW/screenH
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // draw in device pixels
    ctx.drawImage(staticCanvas, 0, 0, staticCanvas.width, staticCanvas.height, 0, 0, screenW, screenH);
    ctx.restore();

    // subtle animated overlay (cloud shimmer) across whole screen
    const t = (ts || performance.now()) * 0.00007;
    ctx.save();
    ctx.globalAlpha = 0.02 + Math.sin(t) * 0.01;
    const overlay = ctx.createLinearGradient(0, 0, screenW, screenH);
    overlay.addColorStop(0, "rgba(255,255,255,0.02)");
    overlay.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.restore();
  }

  // Keep legacy draw for virtual-space composition if needed
  function draw(ctx, state, ts) {
    // small parallax offsets based on virtual coords
    if (!staticCanvas) buildStatic();
    const px = (state.capsule.x - state.BASE_W / 2) * 0.02;
    const py = (state.capsule.y - state.BASE_H / 2) * 0.01;
    ctx.drawImage(staticCanvas, px, py);

    // light overlay in virtual coords
    const t = (ts || performance.now()) * 0.00007;
    ctx.save();
    ctx.globalAlpha = 0.035;
    const overlay = ctx.createLinearGradient(0, 0, state.BASE_W, state.BASE_H);
    overlay.addColorStop(0, `rgba(255,255,255,${0.02 + Math.sin(t) * 0.01})`);
    overlay.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, state.BASE_W, state.BASE_H);
    ctx.restore();
  }

  return { init, resize, draw, drawFullscreen };
}
