export const PLANETS = [
  {
    name: "Merkur",
    r: 0.8,
    hi: "#9c7d6e",
    lo: "#6b5347",
  },
  {
    name: "Venus",
    r: 0.95,
    hi: "#e8d5b7",
    lo: "#c4a880",
  },
  {
    name: "Jorden",
    r: 1,
    hi: "#4a9fd8",
    lo: "#2d5a7a",
    earth: true,
  },
  {
    name: "Mars",
    r: 0.85,
    hi: "#d84a2c",
    lo: "#8c2e1a",
  },
  {
    name: "Jupiter",
    r: 1.3,
    hi: "#c9a876",
    lo: "#8b6f47",
    bands: true,
  },
  {
    name: "Saturn",
    r: 1.15,
    hi: "#e8d5b7",
    lo: "#c4a880",
    ring: true,
  },
  {
    name: "Uranus",
    r: 1.05,
    hi: "#4fc3f7",
    lo: "#2196f3",
  },
  {
    name: "Neptun",
    r: 1.02,
    hi: "#1a5f7a",
    lo: "#0d3b52",
  },
];

export function drawPlanet(ctx, p, x, y, r) {
  let glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
  glow.addColorStop(0, "rgba(255,255,255,0.06)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, 6.2832);
  ctx.fill();

  if (p.ring) {
    ctx.strokeStyle = "rgba(214, 194, 150, 0.55)";
    ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, Math.PI, 6.2832);
    ctx.stroke();
  }

  let body = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r * 1.05,
  );
  body.addColorStop(0, p.hi);
  body.addColorStop(1, p.lo);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.fill();

  if (p.bands || p.earth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.clip();
    if (p.bands) {
      ctx.fillStyle = "rgba(110, 74, 44, 0.35)";
      ctx.fillRect(x - r, y - r * 0.52, r * 2, r * 0.18);
      ctx.fillRect(x - r, y - r * 0.1, r * 2, r * 0.22);
      ctx.fillRect(x - r, y + r * 0.38, r * 2, r * 0.15);
      ctx.fillStyle = "rgba(200, 90, 60, 0.75)";
      ctx.beginPath();
      ctx.ellipse(x + r * 0.35, y + r * 0.24, r * 0.18, r * 0.11, 0, 0, 6.2832);
      ctx.fill();
    }
    if (p.earth) {
      ctx.fillStyle = "rgba(76, 156, 94, 0.85)";
      ctx.beginPath();
      ctx.ellipse(x - r * 0.3, y - r * 0.15, r * 0.42, r * 0.3, 0.5, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        x + r * 0.42,
        y + r * 0.35,
        r * 0.28,
        r * 0.2,
        -0.4,
        0,
        6.2832,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.ellipse(x + r * 0.1, y - r * 0.8, r * 0.35, r * 0.18, 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  if (p.ring) {
    ctx.strokeStyle = "rgba(224, 204, 160, 0.7)";
    ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, 0, Math.PI);
    ctx.stroke();
  }
}
