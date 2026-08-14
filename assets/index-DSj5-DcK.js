import"./tailwind-C5m0IdXT.js";import{r as e,t}from"./tokens-hvNbZHNi.js";(function(){document.documentElement.classList.add(`js-anim`),e();function n(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}let r=[{name:`MERKUR`,r:.02,s0:.06,px:.8,pf:.42,hi:t.planet.merkurHi,lo:t.planet.merkurLo,spin:.05,depth:-80,link:`./arcade/orbit-runner/`},{name:`VENUS`,r:.034,s0:.16,px:.16,pf:.5,hi:t.planet.venusHi,lo:t.planet.venusLo,spin:.035,depth:-40,link:`./arcade/meteor-dodge/`},{name:`JORDEN`,r:.04,s0:.27,px:.83,pf:.58,hi:t.planet.jordenHi,lo:t.planet.jordenLo,earth:!0,spin:.08,depth:0,link:`./arcade/iss-docking/`},{name:`MARS`,r:.028,s0:.38,px:.14,pf:.46,hi:t.planet.marsHi,lo:t.planet.marsLo,spin:.075,depth:-60,link:`./arcade/phobos-lander/`},{name:`JUPITER`,r:.105,s0:.52,px:.85,pf:.62,hi:t.planet.jupiterHi,lo:t.planet.jupiterLo,bands:!0,spin:.16,depth:150,link:`./arcade/comet-pong/`},{name:`SATURN`,r:.08,s0:.67,px:.16,pf:.55,hi:t.planet.saturnHi,lo:t.planet.saturnLo,ring:!0,spin:.15,depth:80,link:`./arcade/star-memory/`},{name:`URANUS`,r:.042,s0:.8,px:.82,pf:.48,hi:t.planet.uranusHi,lo:t.planet.uranusLo,ring:!1,spin:.09,depth:-100,link:`./arcade/nebula-trail/`},{name:`NEPTUN`,r:.046,s0:.9,px:.15,pf:.6,hi:t.planet.neptunHi,lo:t.planet.neptunLo,spin:.095,depth:-130,link:`./arcade/asteroid-breaker/`},{name:`PLUTO`,r:.014,s0:.97,px:.72,pf:.44,hi:t.planet.plutoHi,lo:t.planet.plutoLo,spin:.03,depth:-180,link:`./arcade/`}],i=document.getElementById(`sky`);i&&(i.planets=r,i.addEventListener(`planet-activate`,function(e){let t=e.detail&&e.detail.planet&&e.detail.planet.link;t&&(window.location.href=t)}),i.addEventListener(`planet-enter`,function(){document.documentElement.classList.add(`planet-hover`)}),i.addEventListener(`planet-leave`,function(){document.documentElement.classList.remove(`planet-hover`)}));let a=document.querySelector(`.journey`),o=document.getElementById(`hint`),s=document.getElementById(`contact`),c=document.getElementById(`arcadePills`),l=document.getElementById(`stageName`),u=[],d=1,f=-1,p=-1,m=[[.03,.3],[.36,.62],[.68,.9]];function h(){let e=document.querySelectorAll(`#stageName .word`),t=0;e.forEach(function(e,r){let i=Array.from(e.textContent);e.textContent=``;let a=i.length;i.forEach(function(i,o){let s=document.createElement(`span`);s.className=`ltr`,s.textContent=i,e.appendChild(s);let c=m[r][0],l=m[r][1]-c,d=t*13+5,f=n(d+1)*Math.PI*2,p=Math.max(window.innerWidth,window.innerHeight);u.push({el:s,t0:c+o/a*l*.65,dur:l*.35,dx:Math.cos(f)*(.55+n(d+2)*.7)*p,dy:Math.sin(f)*(.55+n(d+3)*.7)*p,scale:.3+n(d+4)*2.4,rot:(n(d+5)-.5)*90,last:-1}),t++}),e.style.visibility=`visible`})}function g(e){return 1-(1-e)**3}function _(e){for(let t=0;t<u.length;t++){let n=u[t],r=(e-n.t0)/n.dur;if(r=r<0?0:r>1?1:r,r===n.last)continue;n.last=r;let i=g(r),a=1-i;n.el.style.transform=`translate3d(`+(n.dx*a).toFixed(1)+`px,`+(n.dy*a).toFixed(1)+`px,0) rotate(`+(n.rot*a).toFixed(2)+`deg) scale(`+(n.scale+(1-n.scale)*i).toFixed(3)+`)`,n.el.style.opacity=Math.min(1,i*1.8).toFixed(3)}if(l){let t=(1-e)*38;l.style.transform=`translate3d(0,`+t.toFixed(1)+`px,0)`}o&&(o.style.opacity=e>.02?`0`:`1`);let t=(e-.92)/.07;if(t=t<0?0:t>1?1:t,c&&t!==p){p=t;let e=g(t);c.style.opacity=e.toFixed(3),c.style.transform=`translateY(`+(-40*(1-e)).toFixed(1)+`px)`,c.style.pointerEvents=t>.5?`auto`:`none`}if(s&&t!==f){f=t;let e=g(t);s.style.opacity=e.toFixed(3),s.style.transform=`translateY(`+(40*(1-e)).toFixed(1)+`px)`,s.style.pointerEvents=t>.5?`auto`:`none`}}let v=window.scrollY||0,y=!0;function b(){a&&(d=Math.max(1,a.offsetHeight-window.innerHeight)),i&&(i.journeyEnd=d);let e=document.querySelector(`.topbar`);e&&document.documentElement.style.setProperty(`--topbar-h`,e.offsetHeight+`px`),y=!0}let x=[];function S(){let e=document.querySelector(`.stage`);for(let t=0;t<4;t++){let t=document.createElement(`span`);t.className=`title-sat`,e.appendChild(t),x.push({el:t,a:Math.random()*Math.PI*2,speed:6e-4+Math.random()*7e-4,rx:140+Math.random()*120,ry:45+Math.random()*40})}}function C(e){if(!l)return;let t=l.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;for(let t=0;t<x.length;t++){let i=x[t],a=i.a+e*i.speed,o=n+Math.cos(a)*i.rx,s=r+Math.sin(a)*i.ry;i.el.style.transform=`translate3d(`+o.toFixed(1)+`px,`+s.toFixed(1)+`px,0)`}}window.addEventListener(`scroll`,function(){v=window.scrollY,y=!0},{passive:!0}),window.addEventListener(`resize`,b,{passive:!0}),b();let w=document.getElementById(`ufo`),T=window.matchMedia(`(pointer: fine)`).matches,E=-100,D=-100,O=-100,k=-100,A=0;T&&w&&(document.documentElement.classList.add(`ufo-on`),document.addEventListener(`mousemove`,function(e){O=e.clientX,k=e.clientY,w.classList.contains(`live`)||(E=O,D=k,w.classList.add(`live`))},{passive:!0}),document.querySelectorAll(`a`).forEach(function(e){e.addEventListener(`mouseenter`,function(){w.classList.add(`zap`)}),e.addEventListener(`mouseleave`,function(){w.classList.remove(`zap`)})}));function j(){let e=O-E;E+=e*.18,D+=(k-D)*.18;let t=Math.max(-22,Math.min(22,e*.6));A+=(t-A)*.15,w.style.transform=`translate3d(`+(E-24).toFixed(1)+`px,`+(D-18).toFixed(1)+`px,0) rotate(`+A.toFixed(2)+`deg)`;let n=document.querySelector(`.pills`);if(n){let e=n.querySelectorAll(`.pill`),t=!1;for(let n=0;n<e.length;n++){let r=e[n].getBoundingClientRect(),i=r.top-80,a=r.bottom+80,o=r.left,s=r.right;if(E+24>=o&&E+24<=s&&D+18>=i&&D+18<=a){t=!0;break}}t?w.classList.add(`zap`):w.classList.remove(`zap`)}}let M=window.matchMedia(`(prefers-reduced-motion: reduce)`),N=M.matches;function P(){document.documentElement.classList.toggle(`static-home`,N),N?_(1):y=!0}function F(){let e=M.matches;e!==N&&(N=e,P())}M.addEventListener(`change`,F),h(),S(),P(),N||_(0);let I=T&&w;(function e(t){if(i&&(i.scrollOffset=v,i.tick(t)),y&&!N){y=!1;let e=v/d;_(e<0?0:e>1?1:e)}C(t),I&&j(),requestAnimationFrame(e)})(0)})();var n=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,r=`
.egg-layer {
  position: fixed;
  right: 48px;
  bottom: 48px;
  z-index: 90;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
  font-family: var(--font-mono);
}
.egg-layer.egg-in { opacity: 1; }

.egg-scene {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  isolation: isolate;
}
/* The scene is the hover region and one big click target; it only
   takes pointer events while visible. */
.egg-in .egg-scene { pointer-events: auto; cursor: pointer; }

/* A soft dark cloud behind the whole scene, so the line work and the
   red button never drown in whatever sits behind them — the name
   included. Fades away when the destruction takes the alien. */
.egg-scene::before {
  content: "";
  position: absolute;
  inset: -40px -34px -28px -34px;
  background: radial-gradient(
    ellipse 62% 58% at 50% 55%,
    rgba(5, 7, 15, 0.94) 30%,
    rgba(5, 7, 15, 0.6) 58%,
    rgba(5, 7, 15, 0) 78%
  );
  pointer-events: none;
  z-index: -1;
  transition: opacity 0.4s ease;
}
.egg-press4 .egg-scene::before { opacity: 0; }

/* ── Alien ─────────────────────────────────────────────── */
.egg-alien-float { will-change: transform; }
.egg-alien-tilt { will-change: transform; }
.egg-alien { display: block; height: 96px; width: auto; overflow: visible; }
.egg-alien .line { fill: none; stroke: var(--color-ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.egg-alien .thin { stroke-width: 1; }

.egg-eyes { fill: var(--color-red); filter: drop-shadow(0 0 3px rgba(224, 58, 47, 0.9)); }
.egg-antenna-tip { fill: var(--color-red); filter: drop-shadow(0 0 2px rgba(224, 58, 47, 0.9)); }
.egg-glint { stroke: rgba(255, 255, 255, 0.7); }
.egg-sweep { stroke: rgba(255, 255, 255, 0.55); opacity: 0; }
.egg-particle { fill: rgba(255, 255, 255, 0.6); opacity: 0; }

@keyframes eggFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes eggTilt {
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(1deg); }
}
@keyframes eggBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes eggBeacon {
  0%, 92%, 100% { opacity: 0.35; filter: drop-shadow(0 0 1px rgba(224, 58, 47, 0.4)); }
  94%, 97% { opacity: 1; filter: drop-shadow(0 0 5px rgba(224, 58, 47, 1)); }
}
@keyframes eggSweep {
  0%, 88%, 100% { opacity: 0; transform: translateX(0); }
  90% { opacity: 1; }
  96% { opacity: 0; transform: translateX(26px); }
}
@keyframes eggPuff {
  0%, 60% { opacity: 0; transform: translateY(0); }
  66% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(9px); }
}

/* The pair drifts gently side to side across the name and back. The
   travel is capped on phones so the bubble can never leave the left
   edge while the scene is fully drifted. */
.egg-layer { --egg-drift-x: min(60vw, 820px); }
.egg-drift { will-change: transform; }
.egg-idle .egg-drift { animation: eggDrift 26s ease-in-out infinite; }
@keyframes eggDrift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(calc(-1 * var(--egg-drift-x))); }
}

.egg-idle .egg-alien-float { animation: eggFloat 4s ease-in-out infinite; }
.egg-idle .egg-alien-tilt { animation: eggTilt 5.3s ease-in-out infinite; }
.egg-idle .egg-eyes { animation: eggBlink 3s ease-in-out infinite; }
.egg-idle .egg-antenna-tip { animation: eggBeacon 4s linear infinite; }
.egg-idle .egg-sweep { animation: eggSweep 6s linear infinite; }
.egg-idle .egg-particle { animation: eggPuff 2s ease-in infinite; }
.egg-idle .egg-particle.p2 { animation-delay: 0.35s; }
.egg-idle .egg-particle.p3 { animation-delay: 0.7s; }

/* ── Escalation states ─────────────────────────────────── */
.egg-arms-folded { opacity: 0; transition: opacity 0.25s ease; }

@keyframes eggRecoil {
  0% { transform: translateX(0); }
  35% { transform: translateX(10px); }
  100% { transform: translateX(0); }
}
.egg-recoil .egg-alien-tilt { animation: eggRecoil 0.45s cubic-bezier(0.2, 0.8, 0.3, 1); }
.egg-eyes-bright .egg-eyes {
  animation: none;
  opacity: 1;
  filter: drop-shadow(0 0 6px rgba(224, 58, 47, 1)) brightness(1.3);
}

.egg-press2plus .egg-arms-normal { opacity: 0; transition: opacity 0.25s ease; }
.egg-press2plus .egg-arms-folded { opacity: 1; }
.egg-antenna { transform-origin: 60px 13px; transition: transform 0.4s ease; }
.egg-press2plus .egg-antenna { transform: rotate(15deg); }
.egg-idle.egg-press2plus .egg-alien-float { animation-duration: 6.5s; }

.egg-alien-turn { transition: transform 0.45s ease; }
.egg-press3 .egg-alien-turn { transform: scaleX(-1); }
.egg-press3 .egg-eyes, .egg-press3 .egg-glint { animation: none; opacity: 0; transition: opacity 0.2s ease; }
.egg-idle.egg-press3 .egg-particle { animation-duration: 0.7s; }
@keyframes eggBtnPulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 80, 64, 0.8)); }
  50% { filter: drop-shadow(0 0 12px rgba(255, 80, 64, 1)); }
}
.egg-press3 .egg-btn-cap { fill: #ff5040; animation: eggBtnPulse 0.6s ease-in-out infinite; }

.egg-press4 .egg-alien-turn { transform: scaleX(1); }
.egg-press4 .egg-eyes {
  opacity: 1;
  animation: none;
  filter: drop-shadow(0 0 8px rgba(224, 58, 47, 1)) brightness(1.5);
}

/* ── Console ───────────────────────────────────────────── */
.egg-console-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.egg-console { display: block; width: 86px; height: auto; overflow: visible; }
.egg-console .line { fill: none; stroke: var(--color-ink); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.egg-console .cable { stroke: rgba(255, 255, 255, 0.55); stroke-width: 1.1; }
.egg-hazard { fill: none; stroke: var(--color-red); stroke-width: 1.6; opacity: 0.55; }
.egg-ind { fill: var(--color-red); opacity: 0.7; filter: drop-shadow(0 0 2px rgba(224, 58, 47, 0.8)); }
.egg-btn-cap {
  fill: var(--color-red);
  filter: drop-shadow(0 0 6px rgba(224, 58, 47, 0.7));
  transition: filter 0.3s ease, fill 0.3s ease;
}
.egg-label {
  margin-top: 2px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ff5040;
  text-shadow: 0 0 6px rgba(224, 58, 47, 0.9);
  white-space: nowrap;
}

/* The real button sits invisibly over the drawn cap. */
.egg-button {
  position: absolute;
  top: 10px;
  left: 47%;
  transform: translateX(-50%);
  width: 34px;
  height: 30px;
  border-radius: 50%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
}
.egg-layer:not(.egg-in) .egg-button { pointer-events: none; }
.egg-button:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }

/* ── Speech bubble ─────────────────────────────────────── */
.egg-bubble {
  position: absolute;
  right: 0;
  bottom: calc(100% + 14px);
  max-width: min(300px, calc(100vw - 32px));
  width: max-content;
  padding: 6px 11px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  background: rgba(5, 7, 15, 0.85);
  color: var(--color-ink);
  font-size: 0.68rem;
  line-height: 1.45;
  white-space: normal;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}
.egg-bubble::after {
  content: "";
  position: absolute;
  right: 26px;
  top: 100%;
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.5);
}
.egg-bubble.show { opacity: 1; transform: translateY(0); }

/* ── Destruction ───────────────────────────────────────────
   Shake, rotation and scale ride on CSS vars driven by one JS
   interval; everything else is transform/opacity/filter. */
.egg-shaken {
  transform: translate(var(--egg-sx, 0px), var(--egg-sy, 0px))
    rotate(var(--egg-rot, 0deg)) scale(var(--egg-scl, 1));
}

.egg-fx { position: fixed; inset: 0; pointer-events: none; }

.egg-border-flicker { z-index: 330; border: 2px solid var(--color-red); opacity: 0; }
/* exactly three appearances in 0.5s, then gone */
@keyframes eggBorderFlick {
  0%, 20%, 36%, 56%, 72%, 100% { opacity: 0; }
  10%, 46%, 84% { opacity: 1; }
}
.egg-border-flicker.run { animation: eggBorderFlick 0.5s linear 1; }

.egg-band {
  position: fixed;
  left: -80px;
  right: -80px;
  z-index: 310;
  pointer-events: none;
  backdrop-filter: contrast(1.7) invert(0.12) hue-rotate(45deg);
}

@keyframes eggRgb {
  0%, 100% { filter: drop-shadow(-2px 0 rgba(255, 40, 60, 0.85)) drop-shadow(2px 0 rgba(0, 230, 255, 0.85)); }
  50% { filter: drop-shadow(-8px 0 rgba(255, 40, 60, 0.85)) drop-shadow(8px 0 rgba(0, 230, 255, 0.85)); }
}
.egg-rgb { animation: eggRgb 0.16s linear infinite; }

.egg-cracks { z-index: 320; width: 100%; height: 100%; }
.egg-crack { fill: none; stroke: rgba(255, 255, 255, 0.8); stroke-width: 1; }

.egg-scanlines { z-index: 315; opacity: 0; transition: opacity 0.6s ease; overflow: hidden; }
.egg-scanlines.show { opacity: 0.18; }
.egg-scanlines::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: -100%; height: 300%;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 255, 255, 0.35) 3px 4px);
  animation: eggScanRoll 1.4s linear infinite;
}
@keyframes eggScanRoll {
  from { transform: translateY(0); }
  to { transform: translateY(33.33%); }
}

.egg-burnout { transition: opacity 1.2s steps(6, end); opacity: 0 !important; }

@keyframes eggConsoleOut {
  to { transform: translate(-38vw, 6vh) rotate(220deg) scale(0.04); opacity: 0; }
}

.egg-flash { z-index: 380; background: #fff; opacity: 0; }
.egg-blackout { z-index: 390; background: #000; opacity: 0; }

/* ── Dead screen ───────────────────────────────────────── */
.egg-dead {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.25rem;
  pointer-events: auto;
  font-family: var(--font-mono);
}
.egg-dead-line {
  color: var(--color-red);
  font-size: clamp(0.85rem, 3.5vw, 1.15rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
  min-height: 1.4em;
}
.egg-restart {
  margin-top: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: clamp(0.7rem, 1.8vw, 0.85rem);
  letter-spacing: 0.08em;
  color: var(--color-red);
  padding: 0.85rem 1.4rem;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 100px;
  background: rgba(13, 20, 36, 0.72);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.4s ease, border-color 0.25s ease;
}
.egg-restart.show { opacity: 1; animation: eggRestartPulse 1.6s ease-in-out infinite; }
.egg-restart:hover { border-color: var(--color-red); }
.egg-restart:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }
@keyframes eggRestartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}

/* ── Small screens ─────────────────────────────────────── */
@media (max-width: 500px) {
  .egg-layer { right: 8px; --egg-drift-x: 100px; }
  .egg-alien { height: 64px; }
  .egg-console { width: 62px; }
  .egg-label { font-size: 0.48rem; }
  .egg-bubble { font-size: 0.64rem; max-width: min(250px, calc(100vw - 24px)); }
}

@media (prefers-reduced-motion: reduce) {
  .egg-idle .egg-drift,
  .egg-idle .egg-alien-float,
  .egg-idle .egg-alien-tilt,
  .egg-idle .egg-eyes,
  .egg-idle .egg-antenna-tip,
  .egg-idle .egg-sweep,
  .egg-idle .egg-particle { animation: none; }
  .egg-eyes { opacity: 0.6; }
  .egg-sweep, .egg-particle { opacity: 0; }
  /* escalation is text-only: no recoil, no fold, no turn, no pulses */
  .egg-recoil .egg-alien-tilt,
  .egg-press3 .egg-btn-cap { animation: none; }
  .egg-eyes-bright .egg-eyes, .egg-press4 .egg-eyes { filter: none; opacity: 0.6; }
  .egg-press2plus .egg-arms-normal { opacity: 1; }
  .egg-press2plus .egg-arms-folded { opacity: 0; }
  .egg-press2plus .egg-antenna { transform: none; }
  .egg-press3 .egg-alien-turn, .egg-press4 .egg-alien-turn { transform: none; }
  .egg-press3 .egg-eyes { opacity: 0.6; }
  .egg-press3 .egg-glint { opacity: 1; }
  .egg-restart.show { animation: none; }
}
`,i=`
<svg class="egg-alien" viewBox="0 0 100 132" aria-hidden="true">
  <defs>
    <clipPath id="eggHeadClip">
      <path d="M 50 12 C 70 12 82 26 81 42 C 80 58 66 72 50 78 C 34 72 20 58 19 42 C 18 26 30 12 50 12 Z" />
    </clipPath>
  </defs>

  <!-- reaching arm (viewer's left, toward the console) -->
  <g class="egg-arms-normal">
    <path class="line thin" d="M 38 90 C 24 94, 12 98, 5 106" />
    <path class="line thin" d="M 5 106 L 0.5 109 M 5 106 L 4.5 112 M 5 106 L 9 111" />
    <path class="line thin" d="M 62 90 C 70 100, 68 112, 60 118" />
  </g>
  <!-- folded arms, hidden until press 2 -->
  <g class="egg-arms-folded">
    <path class="line thin" d="M 36 94 C 44 104, 56 104, 65 96" />
    <path class="line thin" d="M 64 96 C 56 106, 46 106, 38 98" />
  </g>

  <!-- backpack with exhaust nozzles -->
  <g class="egg-pack">
    <path class="line" d="M 66 94 L 75 96 L 74 112 L 66 110" />
    <path class="line thin" d="M 68.5 112 L 68.5 117 M 72.5 112.4 L 72.5 117" />
    <circle class="egg-particle p1" cx="68.5" cy="120" r="1" />
    <circle class="egg-particle p2" cx="72.5" cy="121" r="0.9" />
    <circle class="egg-particle p3" cx="70.5" cy="119" r="0.8" />
  </g>

  <!-- neck and slender torso tapering to a floating point -->
  <path class="line thin" d="M 46 78 L 46 84 M 54 78 L 54 84" />
  <path class="line" d="M 42 84 L 34 92 L 37 106 L 50 126 L 63 106 L 66 92 L 58 84" />
  <path class="line thin" d="M 44 94 L 44.5 106 M 50 95 L 50 110 M 56 94 L 55.5 106" />

  <!-- the head: big teardrop cranium, pointed chin -->
  <path class="line" d="M 50 12 C 70 12 82 26 81 42 C 80 58 66 72 50 78 C 34 72 20 58 19 42 C 18 26 30 12 50 12 Z" />

  <!-- huge slanted almond eyes, unimpressed by default -->
  <g class="egg-eyes">
    <path d="M 25 36 C 30 30 40 32 44 39 C 43 46 32 48 27 44 C 24 42 23 39 25 36 Z" />
    <path d="M 75 36 C 70 30 60 32 56 39 C 57 46 68 48 73 44 C 76 42 77 39 75 36 Z" />
  </g>

  <!-- nostrils and a flat, unimpressed mouth -->
  <circle class="line thin" cx="47" cy="60" r="0.8" />
  <circle class="line thin" cx="53" cy="60" r="0.8" />
  <path class="line thin" d="M 44 68 L 56 68" />

  <!-- cranium highlight plus the travelling sweep -->
  <path class="line thin egg-glint" d="M 30 22 Q 38 13 48 12" />
  <g clip-path="url(#eggHeadClip)">
    <path class="line thin egg-sweep" d="M 25 36 Q 28 15 46 12" />
  </g>

  <!-- antenna, bent once, beacon tip -->
  <g class="egg-antenna">
    <path class="line thin" d="M 60 13 L 66 5 L 62 1" />
    <circle class="egg-antenna-tip" cx="61.5" cy="1" r="2.2" />
  </g>
</svg>`,a=`
<svg class="egg-console" viewBox="0 0 96 100" aria-hidden="true">
  <!-- pedestal: top face in perspective, then front face -->
  <path class="line" d="M 22 30 Q 24 26 28 26 L 64 26 Q 68 26 70 30 L 82 44 Q 84 47 80 47 L 12 47 Q 8 47 10 44 Z" />
  <path class="line" d="M 10 47 L 10 60 Q 10 63 13 63 L 79 63 Q 82 63 82 60 L 82 47" />
  <!-- hazard chevrons across the front face -->
  <path class="egg-hazard" d="M 17 62 L 23 48 M 27 62 L 33 48 M 37 62 L 43 48" />
  <!-- indicator lights -->
  <circle class="egg-ind" cx="62" cy="55" r="1.8" />
  <circle class="line thin" cx="70" cy="55" r="1.8" />
  <!-- flipped-open safety cover, hinged at the dome's right edge -->
  <ellipse class="line thin" cx="66" cy="14" rx="8" ry="12" transform="rotate(32 66 14)" />
  <path class="line thin" d="M 58 22 L 61 17" />
  <!-- the big red dome itself -->
  <ellipse class="line thin" cx="46" cy="30" rx="13" ry="9.5" fill="none" />
  <ellipse class="egg-btn-cap" cx="46" cy="26" rx="13" ry="9.5" />
  <path class="line thin" d="M 38 22 Q 42 18 48 18" />
  <!-- cable running down and off the layer -->
  <path class="cable" fill="none" d="M 42 63 C 38 76, 52 84, 46 100" />
</svg>`;function o(){let e=document.createElement(`div`);return e.className=`egg-layer`+(n?``:` egg-idle`),e.innerHTML=`
    <div class="egg-drift">
    <div class="egg-scene">
      <div class="egg-bubble" role="status" aria-live="polite"></div>
      <div class="egg-console-wrap">
        ${a}
        <button class="egg-button" type="button" aria-label="Do not push"></button>
        <div class="egg-label">Do not push</div>
      </div>
      <div class="egg-alien-float"><div class="egg-alien-tilt"><div class="egg-alien-turn">${i}</div></div></div>
    </div>
    </div>`,e}function s(){let e=document.createElement(`style`);e.textContent=r,document.head.appendChild(e);let t=o();document.body.appendChild(t);let i=t.querySelector(`.egg-scene`),a=t.querySelector(`.egg-bubble`),s=t.querySelector(`.egg-button`);s.tabIndex=-1;function c(){let e=document.getElementById(`stageName`);if(!e)return;let n=e.getBoundingClientRect(),r=i.offsetHeight||120,a=n.top+n.height/2-r/2;a=Math.max(8,Math.min(a,window.innerHeight-r-8)),t.style.top=a.toFixed(0)+`px`,t.style.bottom=`auto`}let l=!1,u=0;function d(){let e=document.documentElement.scrollHeight-window.innerHeight-window.scrollY<=200;e&&l&&c(),e!==l&&(e&&c(),l=e,t.classList.toggle(`egg-in`,l),s.tabIndex=l?0:-1,l||_(!0),l&&!p&&u===0&&(p=!0,setTimeout(()=>{l&&u===0&&(g(f),h=setTimeout(()=>_(!1),4500))},500)))}window.addEventListener(`scroll`,d,{passive:!0}),window.addEventListener(`resize`,d,{passive:!0}),d();let f=`Whatever you do, do not click the button.`,p=!1,m=null,h=null;function g(e){clearInterval(m),clearTimeout(h),a.textContent=``,a.classList.add(`show`);let t=0;m=setInterval(()=>{a.textContent=e.slice(0,++t),t>=e.length&&clearInterval(m)},40)}function _(e){clearInterval(m),clearTimeout(h),a.classList.remove(`show`),e&&(a.textContent=``)}i.addEventListener(`click`,e=>{e.target!==s&&s.click()}),i.addEventListener(`mouseenter`,()=>{l&&u===0&&g(f)}),i.addEventListener(`mouseleave`,()=>{u===0&&(h=setTimeout(()=>_(!1),600))}),s.addEventListener(`focus`,()=>{l&&u===0&&g(f)});let v=null,y=null;function b(){clearTimeout(h),h=setTimeout(()=>_(!1),2500)}s.addEventListener(`click`,()=>{!l||u>=4||(u+=1,u===1?(g(`Don't.`),b(),t.classList.add(`egg-recoil`,`egg-eyes-bright`),clearTimeout(v),clearTimeout(y),v=setTimeout(()=>t.classList.remove(`egg-recoil`),500),y=setTimeout(()=>t.classList.remove(`egg-eyes-bright`),900)):u===2?(g(`I said don't.`),b(),t.classList.remove(`egg-recoil`,`egg-eyes-bright`),t.classList.add(`egg-press2plus`)):u===3?(g(`Do you know how long that took to build.`),b(),t.classList.add(`egg-press3`)):(t.classList.remove(`egg-press3`),t.classList.add(`egg-press4`),g(`Fine.`),clearTimeout(h),setTimeout(w,400)))});function x(e){let t=document.createElement(`div`);return t.className=`egg-fx `+e,document.body.appendChild(t),t}function S(){let e=`http://www.w3.org/2000/svg`,t=document.createElementNS(e,`svg`);t.setAttribute(`class`,`egg-fx egg-cracks`);let n=window.innerWidth/2,r=window.innerHeight/2;for(let i=0;i<9;i++){let a=i/9*Math.PI*2+Math.random()*.5,o=n,s=r,c=`M ${o.toFixed(0)} ${s.toFixed(0)}`,l=5+Math.floor(Math.random()*3);for(let e=0;e<l;e++){a+=(Math.random()-.5)*.9;let t=40+Math.random()*120;if(o+=Math.cos(a)*t,s+=Math.sin(a)*t,c+=` L ${o.toFixed(0)} ${s.toFixed(0)}`,e===2&&Math.random()<.7){let e=a+(Math.random()<.5?1:-1)*(.6+Math.random()*.5),t=o+Math.cos(e)*(30+Math.random()*60),n=s+Math.sin(e)*(30+Math.random()*60);c+=` M ${o.toFixed(0)} ${s.toFixed(0)} L ${t.toFixed(0)} ${n.toFixed(0)} M ${o.toFixed(0)} ${s.toFixed(0)}`}}let u=document.createElementNS(e,`path`);u.setAttribute(`d`,c),u.setAttribute(`class`,`egg-crack`),u.setAttribute(`pathLength`,`1`),u.style.strokeDasharray=`1`,u.style.strokeDashoffset=`1`,u.style.transition=`stroke-dashoffset 0.7s ease-out ${(i*.08).toFixed(2)}s`,t.appendChild(u)}return document.body.appendChild(t),requestAnimationFrame(()=>requestAnimationFrame(()=>{t.querySelectorAll(`path`).forEach(e=>e.style.strokeDashoffset=`0`)})),t}function C(e,t,n,r){let i=e.getBoundingClientRect(),a=window.innerWidth/2-(i.left+i.width/2),o=window.innerHeight/2-(i.top+i.height/2);e.style.transition=`transform ${n}s cubic-bezier(0.55, -0.15, 0.75, 0.5) ${r}s, opacity 0.25s ease ${(r+n*.8).toFixed(2)}s`,e.style.transform=`translate(${a.toFixed(0)}px, ${o.toFixed(0)}px) ${t} scale(0.04)`,e.style.opacity=`0`}function w(){if(_(!0),document.body.style.overflow=`hidden`,n){let e=x(`egg-blackout`);e.style.transition=`opacity 0.8s ease`,requestAnimationFrame(()=>e.style.opacity=`1`),setTimeout(()=>T(e),900);return}let e=t.querySelector(`.egg-drift`);e&&(e.style.animationPlayState=`paused`);let r=document.documentElement,o=[document.getElementById(`starfield`),document.querySelector(`.dotgrid`),document.querySelector(`.topbar`),document.querySelector(`main`),document.querySelector(`footer`),i].filter(Boolean);o.forEach(e=>e.classList.add(`egg-shaken`));let s=9,c=0,l=0,u=1,d=!1,f=setInterval(()=>{d&&(s=Math.min(15,s+.4),l=Math.min(4,l+.27),u=Math.min(1.08,u+.0054)),r.style.setProperty(`--egg-sx`,((Math.random()*2-1)*(s+c)).toFixed(1)+`px`),r.style.setProperty(`--egg-sy`,((Math.random()*2-1)*s).toFixed(1)+`px`),r.style.setProperty(`--egg-rot`,l.toFixed(2)+`deg`),r.style.setProperty(`--egg-scl`,u.toFixed(4))},80),p=(e,t)=>setTimeout(t,e),m=x(`egg-border-flicker`);m.classList.add(`run`),p(600,()=>m.remove());let h=document.getElementById(`stageName`);p(400,()=>h&&h.classList.add(`egg-rgb`));for(let e=0;e<5;e++)p(400+Math.random()*900,()=>{let e=document.createElement(`div`);e.className=`egg-band`,e.style.top=Math.random()*90+`vh`,e.style.height=18+Math.random()*26+`px`;let t=(20+Math.random()*40)*(Math.random()<.5?-1:1);e.style.transform=`translateX(${t}px)`,document.body.appendChild(e),c=30,setTimeout(()=>{c=0,e.remove()},100)});p(1400,()=>h&&h.classList.remove(`egg-rgb`));let v=null,y=null;p(800,()=>{v=S(),y=x(`egg-scanlines`),requestAnimationFrame(()=>y.classList.add(`show`))}),p(1200,()=>{document.querySelectorAll(`#stageName .ltr`).forEach(e=>{C(e,`rotate(${((20+Math.random()*100)*(Math.random()<.5?-1:1)).toFixed(0)}deg)`,.9,Math.random()*.4)}),document.querySelectorAll(`.topbar .pill, #contact .pill`).forEach(e=>{let t=e.getBoundingClientRect();C(e,`rotate(${(Math.atan2(window.innerHeight/2-(t.top+t.height/2),window.innerWidth/2-(t.left+t.width/2))*180/Math.PI).toFixed(0)}deg) scaleX(1.7)`,1,.15+Math.random()*.35)})});let b=x(`egg-flash`);p(2600,()=>{b.style.transition=`opacity 0.12s ease-in`,b.style.opacity=`1`,setTimeout(()=>{b.style.transition=`opacity 0.25s ease-out`,b.style.opacity=`0`},130),document.getElementById(`starfield`).classList.add(`egg-burnout`),document.querySelector(`.dotgrid`)?.classList.add(`egg-burnout`),d=!0}),p(3550,()=>{a.style.position=`fixed`,a.style.left=`50%`,a.style.right=`auto`,a.style.bottom=`auto`,a.style.top=`16%`,a.style.transform=`translateX(-50%)`,a.style.zIndex=`395`,document.body.appendChild(a),g(`Told you.`)}),p(3600,()=>{let e=t.querySelector(`.egg-alien-float`),n=t.querySelector(`.egg-console-wrap`),r=e.getBoundingClientRect(),i=window.innerWidth/2-(r.left+r.width/2),a=window.innerHeight/2-(r.top+r.height/2),o=Math.min(5.5,Math.max(3,window.innerHeight/190));e.style.animation=`none`,e.firstElementChild.style.animation=`none`,e.offsetWidth,e.style.transition=`transform 0.55s cubic-bezier(0.5, 0, 0.6, 1)`,e.style.transform=`translate(${i.toFixed(0)}px, ${a.toFixed(0)}px) rotate(360deg) scale(${o.toFixed(2)})`,n.style.animation=`eggConsoleOut 0.5s cubic-bezier(0.55, -0.15, 0.75, 0.5) 0.12s forwards`});let w=x(`egg-blackout`);p(4200,()=>{_(!0),b.style.transition=`opacity 0.1s ease-in`,b.style.opacity=`1`,setTimeout(()=>{w.style.transition=`opacity 0.4s ease`,w.style.opacity=`1`,b.style.transition=`opacity 0.4s ease`,b.style.opacity=`0`},250)}),p(4700,()=>{clearInterval(f),o.forEach(e=>e.classList.remove(`egg-shaken`)),[`--egg-sx`,`--egg-sy`,`--egg-rot`,`--egg-scl`].forEach(e=>r.style.removeProperty(e)),v?.remove(),y?.remove(),m.remove(),b.remove()}),p(5e3,()=>T(w))}function T(){let e=document.createElement(`div`);e.className=`egg-dead`,e.innerHTML=`
      <div class="egg-dead-line"></div>
      <div class="egg-dead-line"></div>
      <button class="egg-restart" type="button">RESTART UNIVERSE</button>`,document.body.appendChild(e);let[t,n]=e.querySelectorAll(`.egg-dead-line`),r=e.querySelector(`.egg-restart`);function i(e,t,n){let r=0,i=setInterval(()=>{e.textContent=t.slice(0,++r),r>=t.length&&(clearInterval(i),n())},45)}i(t,`SIGNAL LOST`,()=>{setTimeout(()=>{i(n,`UNIVERSE UNAVAILABLE`,()=>{setTimeout(()=>{r.classList.add(`show`),r.focus()},1e3)})},600)});let a=!1;function o(){a||(a=!0,e.style.transition=`opacity 0.3s ease`,e.style.opacity=`0`,history.scrollRestoration=`manual`,window.scrollTo(0,0),setTimeout(()=>window.location.reload(),300))}r.addEventListener(`click`,o),window.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `||e.key===`Escape`)&&(e.preventDefault(),o())})}}s();