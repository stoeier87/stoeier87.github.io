import { DIAGRAMS, TOOLS, renderToolContent, reduced, isMobile, mulberry32 } from "./tools-data.js";

/* Same quiet starfield backdrop as every other page in /tools. */
function backdrop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, stars = [];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = mulberry32(4118);
    const n = isMobile() ? 70 : 140;
    stars = Array.from({ length: n }, () => ({
      x: rnd() * w, y: rnd() * h,
      r: 0.3 + rnd() * 0.9,
      a: 0.1 + rnd() * 0.32,
      sp: 0.15 + rnd() * 0.5,
      ph: rnd() * 6.28,
    }));
  }

  function frame(t) {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = reduced() ? s.a : s.a * (0.7 + 0.3 * Math.sin(t * 0.0008 * s.sp + s.ph));
      ctx.fillStyle = "#dfe8ff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  size();
  window.addEventListener("resize", size, { passive: true });
  requestAnimationFrame(frame);
}

/* Boots a single tool's page: draws the backdrop, renders the model and
   its content, and plays the assembly animation once the page has
   painted. No FLIP/move-to-centre step here — there is no field node to
   animate from on a direct page load, so the model draws in place. */
export function boot(toolId) {
  backdrop(document.getElementById("backdrop"));

  const tool = TOOLS.find((t) => t.id === toolId);
  if (!tool) return;
  const diagramDef = DIAGRAMS[tool.diagram];

  const diagramWrap = document.querySelector(".tool-page-diagram-wrap");
  const diagramHost = document.getElementById("diagramHost");
  const content = document.getElementById("toolContent");

  if (diagramDef.stageWidth) {
    diagramWrap.style.width = diagramDef.stageWidth(isMobile());
  }

  const svg = diagramDef.buildStage();
  svg.setAttribute("class", "stage-diagram");
  diagramHost.appendChild(svg);

  renderToolContent(tool, content);

  let activeAnim = null;

  function play() {
    activeAnim = diagramDef.assemble(svg);
    const t = setTimeout(() => content.classList.add("show"), activeAnim.doneAt + 20);
    activeAnim.timers.push(t);
  }

  requestAnimationFrame(() => requestAnimationFrame(play));

  diagramWrap.addEventListener("click", () => {
    if (!activeAnim) return;
    activeAnim.timers.forEach(clearTimeout);
    activeAnim.applyFinal();
    content.classList.add("show");
    activeAnim = null;
  });
}
