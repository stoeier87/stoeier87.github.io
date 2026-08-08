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

    // Earth - smaller, anchored bottom-left proportionally
    const earthRadius = baseW * 0.42;
    const earthX = -earthRadius * 0.15;
    const earthY = baseH - earthRadius * 0.52;

    const eg = octx.createRadialGradient(
      earthX - earthRadius * 0.18,
      earthY - earthRadius * 0.28,
      earthRadius * 0.08,
      earthX,
      earthY,
      earthRadius,
    );
    eg.addColorStop(0, "#2b6aa2");
    eg.addColorStop(0.7, "#143a5f");
    eg.addColorStop(1, "#071929");
    octx.beginPath();
    octx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
    octx.fillStyle = eg;
    octx.fill();

    // atmosphere rim
    octx.beginPath();
    octx.arc(earthX, earthY, earthRadius + 6, 0, Math.PI * 2);
    octx.strokeStyle = "rgba(140,200,255,0.06)";
    octx.lineWidth = 12;
    octx.stroke();

    // clouds: pre-rendered translucent blobs
    octx.save();
    octx.globalAlpha = 0.12;
    octx.fillStyle = "#fff";
    for (let i = 0; i < 10; i++) {
      const angle = (i * 37) * (Math.PI / 180);
      const rx = earthX + Math.cos(angle) * earthRadius * (0.12 + (i % 3) * 0.06);
      const ry = earthY + Math.sin(angle) * earthRadius * (0.16 + (i % 4) * 0.04);
      octx.beginPath();
      octx.ellipse(rx, ry, earthRadius * 0.14, earthRadius * 0.07, angle * 0.5, 0, Math.PI * 2);
      octx.fill();
    }
    octx.restore();

    // subtle terminator shadow
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
  }

  function init() {
    buildStatic();
  }

  function resize(w, h) {
    baseW = w || baseW;
    baseH = h || baseH;
    buildStatic();
  }

  function draw(ctx, state, ts) {
    if (!staticCanvas) buildStatic();
    // parallax small offsets
    const px = (state.capsule.x - state.BASE_W / 2) * 0.02;
    const py = (state.capsule.y - state.BASE_H / 2) * 0.01;

    ctx.drawImage(staticCanvas, px, py);

    // subtle animated overlay: slight cloud shimmer using a low-alpha rotating gradient
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

  return { init, resize, draw };
}
