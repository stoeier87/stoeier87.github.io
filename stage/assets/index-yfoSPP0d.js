import"./tailwind-D3cAdbGj.js";import"./version-badge-BHV0Er36.js";import{r as e,t}from"./tokens-DZhOMBh-.js";(function(){document.documentElement.classList.add(`js-anim`),e();function n(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}let r=[{name:`MERKUR`,r:.02,s0:.06,px:.8,pf:.42,hi:t.planet.merkurHi,lo:t.planet.merkurLo,spin:.05,depth:-80,link:`./arcade/orbit-runner/`},{name:`VENUS`,r:.034,s0:.16,px:.16,pf:.5,hi:t.planet.venusHi,lo:t.planet.venusLo,spin:.035,depth:-40,link:`./arcade/meteor-dodge/`},{name:`JORDEN`,r:.04,s0:.27,px:.83,pf:.58,hi:t.planet.jordenHi,lo:t.planet.jordenLo,earth:!0,spin:.08,depth:0,link:`./arcade/iss-docking/`},{name:`MARS`,r:.028,s0:.38,px:.14,pf:.46,hi:t.planet.marsHi,lo:t.planet.marsLo,spin:.075,depth:-60,link:`./arcade/phobos-lander/`},{name:`JUPITER`,r:.105,s0:.52,px:.85,pf:.62,hi:t.planet.jupiterHi,lo:t.planet.jupiterLo,bands:!0,spin:.16,depth:150,link:`./arcade/galileo/`},{name:`SATURN`,r:.08,s0:.67,px:.16,pf:.55,hi:t.planet.saturnHi,lo:t.planet.saturnLo,ring:!0,spin:.15,depth:80,link:`./arcade/star-memory/`},{name:`URANUS`,r:.042,s0:.8,px:.82,pf:.48,hi:t.planet.uranusHi,lo:t.planet.uranusLo,ring:!1,spin:.09,depth:-100,link:`./arcade/nebula-trail/`},{name:`NEPTUN`,r:.046,s0:.9,px:.15,pf:.6,hi:t.planet.neptunHi,lo:t.planet.neptunLo,spin:.095,depth:-130,link:`./arcade/asteroid-breaker/`},{name:`PLUTO`,r:.014,s0:.97,px:.72,pf:.44,hi:t.planet.plutoHi,lo:t.planet.plutoLo,spin:.03,depth:-180,link:`./arcade/`}],i=document.getElementById(`sky`);i&&(i.planets=r,i.addEventListener(`planet-activate`,function(e){let t=e.detail&&e.detail.planet&&e.detail.planet.link;t&&(window.location.href=t)}),i.addEventListener(`planet-enter`,function(){document.documentElement.classList.add(`planet-hover`)}),i.addEventListener(`planet-leave`,function(){document.documentElement.classList.remove(`planet-hover`)}));let a=document.querySelector(`.journey`),o=document.getElementById(`hint`),s=document.getElementById(`contact`),c=document.getElementById(`arcadePills`),l=document.getElementById(`stageName`),u=[],d=1,f=-1,p=-1,m=[[.03,.3],[.36,.62],[.68,.9]];function h(){let e=document.querySelectorAll(`#stageName .word`),t=0;e.forEach(function(e,r){let i=Array.from(e.textContent);e.textContent=``;let a=i.length;i.forEach(function(i,o){let s=document.createElement(`span`);s.className=`ltr`,s.textContent=i,e.appendChild(s);let c=m[r][0],l=m[r][1]-c,d=t*13+5,f=n(d+1)*Math.PI*2,p=Math.max(window.innerWidth,window.innerHeight);u.push({el:s,t0:c+o/a*l*.65,dur:l*.35,dx:Math.cos(f)*(.55+n(d+2)*.7)*p,dy:Math.sin(f)*(.55+n(d+3)*.7)*p,scale:.3+n(d+4)*2.4,rot:(n(d+5)-.5)*90,last:-1}),t++}),e.style.visibility=`visible`})}function g(e){return 1-(1-e)**3}function _(e){for(let t=0;t<u.length;t++){let n=u[t],r=(e-n.t0)/n.dur;if(r=r<0?0:r>1?1:r,r===n.last)continue;n.last=r;let i=g(r),a=1-i;n.el.style.transform=`translate3d(`+(n.dx*a).toFixed(1)+`px,`+(n.dy*a).toFixed(1)+`px,0) rotate(`+(n.rot*a).toFixed(2)+`deg) scale(`+(n.scale+(1-n.scale)*i).toFixed(3)+`)`,n.el.style.opacity=Math.min(1,i*1.8).toFixed(3)}if(l){let t=(1-e)*38;l.style.transform=`translate3d(0,`+t.toFixed(1)+`px,0)`}o&&(o.style.opacity=e>.02?`0`:`1`);let t=(e-.92)/.07;if(t=t<0?0:t>1?1:t,c&&t!==p){p=t;let e=g(t);c.style.opacity=e.toFixed(3),c.style.transform=`translateY(`+(-40*(1-e)).toFixed(1)+`px)`,c.style.pointerEvents=t>.5?`auto`:`none`}if(s&&t!==f){f=t;let e=g(t);s.style.opacity=e.toFixed(3),s.style.transform=`translateY(`+(40*(1-e)).toFixed(1)+`px)`,s.style.pointerEvents=t>.5?`auto`:`none`}}let v=window.scrollY||0,y=!0;function b(){a&&(d=Math.max(1,a.offsetHeight-window.innerHeight)),i&&(i.journeyEnd=d);let e=document.querySelector(`.topbar`);e&&document.documentElement.style.setProperty(`--topbar-h`,e.offsetHeight+`px`),y=!0}let x=[];function S(){let e=document.querySelector(`.stage`);for(let t=0;t<4;t++){let t=document.createElement(`span`);t.className=`title-sat`,e.appendChild(t),x.push({el:t,a:Math.random()*Math.PI*2,speed:6e-4+Math.random()*7e-4,rx:140+Math.random()*120,ry:45+Math.random()*40})}}function C(e){if(!l)return;let t=l.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;for(let t=0;t<x.length;t++){let i=x[t],a=i.a+e*i.speed,o=n+Math.cos(a)*i.rx,s=r+Math.sin(a)*i.ry;i.el.style.transform=`translate3d(`+o.toFixed(1)+`px,`+s.toFixed(1)+`px,0)`}}window.addEventListener(`scroll`,function(){v=window.scrollY,y=!0},{passive:!0}),window.addEventListener(`resize`,b,{passive:!0}),b();let w=document.getElementById(`ufo`),T=window.matchMedia(`(pointer: fine)`).matches,E=-100,D=-100,O=-100,k=-100,A=0;T&&w&&(document.documentElement.classList.add(`ufo-on`),document.addEventListener(`mousemove`,function(e){O=e.clientX,k=e.clientY,w.classList.contains(`live`)||(E=O,D=k,w.classList.add(`live`))},{passive:!0}),document.querySelectorAll(`a`).forEach(function(e){e.addEventListener(`mouseenter`,function(){w.classList.add(`zap`)}),e.addEventListener(`mouseleave`,function(){w.classList.remove(`zap`)})}));function j(){let e=O-E;E+=e*.18,D+=(k-D)*.18;let t=Math.max(-22,Math.min(22,e*.6));A+=(t-A)*.15,w.style.transform=`translate3d(`+(E-24).toFixed(1)+`px,`+(D-18).toFixed(1)+`px,0) rotate(`+A.toFixed(2)+`deg)`;let n=document.querySelector(`.pills`);if(n){let e=n.querySelectorAll(`.pill`),t=!1;for(let n=0;n<e.length;n++){let r=e[n].getBoundingClientRect(),i=r.top-80,a=r.bottom+80,o=r.left,s=r.right;if(E+24>=o&&E+24<=s&&D+18>=i&&D+18<=a){t=!0;break}}t?w.classList.add(`zap`):w.classList.remove(`zap`)}}let M=window.matchMedia(`(prefers-reduced-motion: reduce)`),N=M.matches;function P(){document.documentElement.classList.toggle(`static-home`,N),N?_(1):y=!0}function F(){let e=M.matches;e!==N&&(N=e,P())}M.addEventListener(`change`,F),h(),S(),P(),N||_(0);let I=T&&w;(function e(t){if(i&&(i.scrollOffset=v,i.tick(t)),y&&!N){y=!1;let e=v/d;_(e<0?0:e>1?1:e)}C(t),I&&j(),requestAnimationFrame(e)})(0)})();var n=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,r=`http://www.w3.org/2000/svg`;function i(e,t){let n=document.createElementNS(r,e);for(let e in t)n.setAttribute(e,t[e]);return n}function a(e,t,n,r,i,a,o,s){let c=[];for(let l=0;l<=o;l++){let u=l/o,d=(i+(a-i)*u)*Math.PI/180,f=1+(Math.random()-.5)*s;c.push([e+Math.cos(d)*n*f,t+Math.sin(d)*r*f])}return c}function o(e,t){let n=`M ${e[0][0].toFixed(1)} ${e[0][1].toFixed(1)}`;for(let t=1;t<e.length;t++)n+=` L ${e[t][0].toFixed(1)} ${e[t][1].toFixed(1)}`;if(t){let[r,i]=e[e.length-2],[a,o]=e[e.length-1],s=a-r,c=o-i,l=Math.hypot(s,c)||1;n+=` L ${(a+s/l*t).toFixed(1)} ${(o+c/l*t).toFixed(1)}`}return n}function s(){let e=i(`svg`,{class:`egg-station`,viewBox:`0 0 120 120`,"aria-hidden":`true`}),t=i(`defs`,{});function n(e,n,r,a){let o=i(n,{id:e,...r});a.forEach(([e,t,n])=>{let r=i(`stop`,{offset:e,"stop-color":t});n!=null&&r.setAttribute(`stop-opacity`,n),o.appendChild(r)}),t.appendChild(o)}n(`eggBody`,`radialGradient`,{cx:`38%`,cy:`34%`,r:`78%`},[[`0%`,`#f4f5f7`],[`28%`,`#c7ccd5`],[`55%`,`#8b93a1`],[`78%`,`#3d4451`],[`100%`,`#101319`]]),n(`eggShade`,`radialGradient`,{cx:`38%`,cy:`34%`,r:`78%`},[[`0%`,`#000000`,`0`],[`62%`,`#000000`,`0`],[`100%`,`#04060b`,`0.85`]]),n(`eggDishBowl`,`radialGradient`,{cx:`50%`,cy:`50%`,r:`50%`},[[`0%`,`#1a1e26`],[`62%`,`#3c434f`],[`100%`,`#79818e`]]),e.appendChild(t),e.appendChild(i(`circle`,{cx:60,cy:60,r:38,fill:`url(#eggBody)`}));let r=i(`clipPath`,{id:`eggSphereClip`});r.appendChild(i(`circle`,{cx:60,cy:60,r:37.5})),t.appendChild(r);let s=i(`g`,{class:`egg-spin`,"clip-path":`url(#eggSphereClip)`});s.style.transformOrigin=`60px 60px`;let c=i(`g`,{class:`egg-surface-seams`});c.appendChild(i(`path`,{d:o(a(60,44,30,7,190,350,20,.02)),fill:`none`})),c.appendChild(i(`path`,{d:o(a(60,78,28,6,12,168,18,.02)),fill:`none`}));for(let e=0;e<7;e++){let e=Math.random()*Math.PI*2,t=38*(.35+Math.random()*.5),n=60+Math.cos(e)*t,r=60+Math.sin(e)*t,a=e+Math.PI/2+(Math.random()-.5)*.4,o=4+Math.random()*5;c.appendChild(i(`path`,{d:`M ${(n-Math.cos(a)*o/2).toFixed(1)} ${(r-Math.sin(a)*o/2).toFixed(1)} L ${(n+Math.cos(a)*o/2).toFixed(1)} ${(r+Math.sin(a)*o/2).toFixed(1)}`,fill:`none`}))}s.appendChild(c),e.appendChild(s),e.appendChild(i(`path`,{d:o(a(60,68,36.5,7,187,353,22,.015)),class:`egg-equator`,fill:`none`})),e.appendChild(i(`circle`,{cx:60,cy:60,r:38,fill:`url(#eggShade)`})),e.appendChild(i(`path`,{d:o(a(60,60,37.4,37.4,18,108,14,.01)),class:`egg-rimlight`,fill:`none`}));let l=i(`g`,{});l.appendChild(i(`circle`,{cx:46,cy:44,r:13,fill:`url(#eggDishBowl)`})),l.appendChild(i(`circle`,{cx:46,cy:44,r:7.15.toFixed(1),class:`egg-dish-ring`,fill:`none`})),l.appendChild(i(`path`,{d:o(a(46,44,12.6,12.6,150,305,14,.01)),class:`egg-dish-rim`,fill:`none`})),l.appendChild(i(`circle`,{cx:46,cy:44,r:`3`,class:`egg-dish-inner`})),e.appendChild(l);let u=i(`g`,{class:`egg-cracks-static`}),d=[{hit:1,d:`M 42 32 L 48 42 L 46 52`},{hit:2,d:`M 46 52 L 54 58 L 60 70`},{hit:2,d:`M 48 42 L 40 46 L 34 54`},{hit:4,d:`M 60 70 L 68 76 L 80 80`},{hit:4,d:`M 54 58 L 62 52 L 74 50`},{hit:4,d:`M 34 54 L 30 66 L 36 78`}].map(e=>{let t=i(`path`,{d:e.d,class:`egg-crack`,pathLength:`1`});return t.dataset.hit=e.hit,u.appendChild(t),t});return e.appendChild(u),{svg:e,crackEls:d}}var c=`
.egg-layer {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--egg-size, 100px);
  height: var(--egg-size, 100px);
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
  flex-direction: column;
  align-items: center;
  isolation: isolate;
}
/* ── Station surface ───────────────────────────────────── */
.egg-tier-white { stroke: var(--color-ink); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.egg-tier-mid { stroke: rgba(255, 255, 255, 0.65); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; }
.egg-surface-seams { stroke: rgba(10, 13, 20, 0.35); stroke-width: 1; stroke-linecap: round; }
.egg-equator { stroke: rgba(8, 10, 16, 0.55); stroke-width: 2; stroke-linecap: round; }
.egg-rimlight { stroke: rgba(140, 195, 255, 0.35); stroke-width: 1.2; stroke-linecap: round; }
.egg-dish-ring { stroke: rgba(255, 255, 255, 0.22); stroke-width: 1; }
.egg-dish-rim { stroke: rgba(255, 255, 255, 0.8); stroke-width: 1.5; stroke-linecap: round; }
.egg-dish-inner { fill: rgba(255, 255, 255, 0.9); opacity: 0.25; filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5)); }
.egg-crack {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition: stroke-dashoffset 0.5s ease-out, opacity 0.1s ease;
}
.egg-crack.show { opacity: 1; stroke-dashoffset: 0; }

/* Sized by placeScene to sit inside the counter of FULLERTON's O with a
   little room around it — the O is its orbit. */
.egg-station { display: block; width: var(--egg-size, 100px); height: var(--egg-size, 100px); overflow: visible; }
.egg-station-btn {
  display: block;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  pointer-events: auto;
}
.egg-layer:not(.egg-in) .egg-station-btn { pointer-events: none; }
.egg-station-btn:focus-visible { outline: 2px solid var(--color-red); outline-offset: 6px; border-radius: 50%; }

/* ── Idle motion ───────────────────────────────────────── */
.egg-station-entrance {
  opacity: 0;
  transform: rotate(15deg);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.egg-in .egg-station-entrance { opacity: 1; transform: rotate(0deg); }

@keyframes eggStationBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.egg-idle .egg-station-float { animation: eggStationBob 6s ease-in-out infinite; }

/* The station drifts back and forth around the O — an 8 s loop that strays
   just past the letter at each extreme before returning. Amplitude comes
   from the measured letter width in placeScene. Vertical travel stays the
   6px bob in eggStationBob; this axis is horizontal only. */
.egg-layer { --egg-orbit-x: 40px; }
@keyframes eggOrbit {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(var(--egg-orbit-x)); }
  75% { transform: translateX(calc(-1 * var(--egg-orbit-x))); }
}
.egg-idle .egg-wander { animation: eggOrbit 8s ease-in-out infinite; }

/* FULLERTON renders in the accent colour and the station in front of it is
   white line work, so the letters it covers step back a touch. Filter, not
   opacity: the journey writes inline opacity on every .ltr and would win. */
#stageName .ltr { transition: filter 0.25s ease; }
#stageName .ltr.egg-ltr-dim { filter: brightness(0.55); }

@keyframes eggStationSpin { to { transform: rotate(360deg); } }
@keyframes eggStationSpinUneven {
  0% { transform: rotate(0deg); }
  8% { transform: rotate(38deg); }
  16% { transform: rotate(44deg); }
  30% { transform: rotate(118deg); }
  40% { transform: rotate(150deg); }
  55% { transform: rotate(208deg); }
  62% { transform: rotate(226deg); }
  80% { transform: rotate(300deg); }
  88% { transform: rotate(324deg); }
  100% { transform: rotate(360deg); }
}
.egg-idle .egg-spin { animation: eggStationSpin 90s linear infinite; }
.egg-idle.egg-hit1 .egg-spin { animation-duration: 70s; }
.egg-idle.egg-hit3 .egg-spin { animation: eggStationSpinUneven 66s ease-in-out infinite; }

@keyframes eggDishBreathe {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.35; }
}
.egg-idle .egg-dish-inner { animation: eggDishBreathe 4s ease-in-out infinite; }

.egg-station-tilt { transition: transform 0.5s ease; }
.egg-station-jitter { will-change: transform; }
@keyframes eggStationJitter {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 1px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-1px, 2px); }
  100% { transform: translate(0, 0); }
}
.egg-station-wrap { position: relative; display: block; }

/* ── Shots ─────────────────────────────────────────────
   The homepage's own UFO already follows the cursor, so it is the ship —
   the bolt just leaves from wherever it is. */
/* Return fire is the station's, so it is white-hot rather than the red of
   the shot that provoked it — you can tell incoming from outgoing. */
.egg-bolt-return { background: #eaf2ff; box-shadow: 0 0 8px rgba(190, 220, 255, 0.95); width: 20px; }
.egg-bolt { position: fixed; left: 0; top: 0; width: 16px; height: 2px; background: var(--color-red); border-radius: 2px; transform-origin: 0 50%; box-shadow: 0 0 6px var(--color-red); pointer-events: none; z-index: 95; }
.egg-ring { position: fixed; left: 0; top: 0; width: 6px; height: 6px; margin: -3px 0 0 -3px; border: 1.5px solid var(--color-red); border-radius: 50%; opacity: 0.9; transform: scale(1); pointer-events: none; z-index: 95; transition: transform 0.3s ease-out, opacity 0.3s ease-out; }
.egg-ring.run { transform: scale(6); opacity: 0; }

/* ── Damage escalation (cumulative — hit classes never clear) ── */
@keyframes eggRecoil { 0% { transform: translateX(0); } 35% { transform: translateX(8px); } 100% { transform: translateX(0); } }
.egg-recoil-once .egg-station-tilt { animation: eggRecoil 0.45s cubic-bezier(0.2, 0.8, 0.3, 1); }

@keyframes eggSparkFall { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(var(--sx, 4px), 20px); } }
.egg-spark { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--color-red); opacity: 0; pointer-events: none; filter: drop-shadow(0 0 3px rgba(224, 58, 47, 0.9)); }
.egg-spark-run .egg-spark-1 { animation: eggSparkFall 0.7s ease-in forwards; }
.egg-spark-run .egg-spark-2 { animation: eggSparkFall 0.8s ease-in forwards 0.08s; --sx: -6px; }

.egg-hit3 .egg-station-tilt { transform: rotate(8deg); }
@keyframes eggDishFlickerHard {
  0% { opacity: 0.3; } 12% { opacity: 0.04; } 22% { opacity: 0.4; } 34% { opacity: 0.02; }
  46% { opacity: 0.3; } 60% { opacity: 0.05; } 76% { opacity: 0.2; } 100% { opacity: 0.1; }
}
.egg-hit3 .egg-dish-inner { animation: eggDishFlickerHard 0.5s steps(2, end) forwards; }

.egg-hit4 .egg-station-jitter { animation: eggStationJitter 0.32s steps(5, end) infinite; }
.egg-hit4 .egg-dish-inner { animation: none; opacity: 0.05; }
.egg-hit4 .egg-dish-rim { opacity: 0.3; }

/* ── The Big Bang ──────────────────────────────────────
   The station going critical is the singularity: everything collapses
   inward, holds for a beat of nothing, then the universe starts again. */
/* These sit ABOVE .egg-blackout (390) — the bang happens on the black,
   not behind it — and below .egg-dead (400). */
.egg-singularity {
  position: fixed; left: 0; top: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px;
  border-radius: 50%; background: #fff; z-index: 395; pointer-events: none;
  opacity: 0; transform: scale(0);
  box-shadow: 0 0 20px 6px rgba(255, 255, 255, 0.9), 0 0 60px 20px rgba(160, 200, 255, 0.5);
}
.egg-shockwave {
  position: fixed; left: 0; top: 0; width: 20px; height: 20px; margin: -10px 0 0 -10px;
  border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.9); z-index: 393;
  pointer-events: none; opacity: 0.9; transform: scale(0.2);
  transition: transform 0.75s cubic-bezier(0.15, 0.7, 0.3, 1), opacity 0.75s ease-out;
}
.egg-shockwave.run { transform: scale(var(--sw-scale, 40)); opacity: 0; }
/* The blast itself is light, not a disc — a gradient that stays hot in the
   middle and has no edge at all. */
.egg-blast {
  position: fixed; left: 0; top: 0; width: 40px; height: 40px; margin: -20px 0 0 -20px;
  border-radius: 50%; z-index: 394; pointer-events: none; opacity: 1; transform: scale(0.3);
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 246, 224, 0.95) 18%,
    rgba(255, 200, 140, 0.6) 38%,
    rgba(150, 190, 255, 0.28) 62%,
    rgba(120, 160, 255, 0) 100%
  );
}
.egg-ember {
  position: fixed; left: 0; top: 0; width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px;
  border-radius: 50%; z-index: 394; pointer-events: none;
  box-shadow: 0 0 6px 1px currentColor; color: #fff; background: currentColor;
}

/* ── Destruction (unchanged mechanics, ported from the alien build) ── */
.egg-shaken {
  transform: translate(var(--egg-sx, 0px), var(--egg-sy, 0px))
    rotate(var(--egg-rot, 0deg)) scale(var(--egg-scl, 1));
}
.egg-fx { position: fixed; inset: 0; pointer-events: none; }
.egg-border-flicker { z-index: 330; border: 2px solid var(--color-red); opacity: 0; }
@keyframes eggBorderFlick {
  0%, 20%, 36%, 56%, 72%, 100% { opacity: 0; }
  10%, 46%, 84% { opacity: 1; }
}
.egg-border-flicker.run { animation: eggBorderFlick 0.5s linear 1; }
.egg-band {
  position: fixed; left: -80px; right: -80px; z-index: 310; pointer-events: none;
  backdrop-filter: contrast(1.7) invert(0.12) hue-rotate(45deg);
}
@keyframes eggRgb {
  0%, 100% { filter: drop-shadow(-2px 0 rgba(255, 40, 60, 0.85)) drop-shadow(2px 0 rgba(0, 230, 255, 0.85)); }
  50% { filter: drop-shadow(-8px 0 rgba(255, 40, 60, 0.85)) drop-shadow(8px 0 rgba(0, 230, 255, 0.85)); }
}
.egg-rgb { animation: eggRgb 0.16s linear infinite; }
.egg-cracks-fx { z-index: 320; width: 100%; height: 100%; }
.egg-crack-fx { fill: none; stroke: rgba(255, 255, 255, 0.8); stroke-width: 1; }
.egg-scanlines { z-index: 315; opacity: 0; transition: opacity 0.6s ease; overflow: hidden; }
.egg-scanlines.show { opacity: 0.18; }
.egg-scanlines::before {
  content: ""; position: absolute; left: 0; right: 0; top: -100%; height: 300%;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 255, 255, 0.35) 3px 4px);
  animation: eggScanRoll 1.4s linear infinite;
}
@keyframes eggScanRoll { from { transform: translateY(0); } to { transform: translateY(33.33%); } }
.egg-burnout { transition: opacity 1.2s steps(6, end); opacity: 0 !important; }
.egg-flash { z-index: 380; background: #fff; opacity: 0; }
.egg-blackout { z-index: 390; background: #000; opacity: 0; }

/* ── Dead screen ───────────────────────────────────────── */
.egg-dead {
  position: fixed; inset: 0; z-index: 400; background: #000; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem; padding: 1.25rem; pointer-events: auto;
  font-family: var(--font-mono);
}
.egg-dead-line {
  color: var(--color-red); font-size: clamp(0.85rem, 3.5vw, 1.15rem); letter-spacing: 0.22em;
  text-transform: uppercase; white-space: nowrap; min-height: 1.4em;
}
.egg-restart {
  margin-top: 1.6rem; display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: clamp(0.7rem, 1.8vw, 0.85rem); letter-spacing: 0.08em;
  color: var(--color-red); padding: 0.85rem 1.4rem; border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 100px; background: rgba(13, 20, 36, 0.72); cursor: pointer; opacity: 0;
  transition: opacity 0.4s ease, border-color 0.25s ease;
}
.egg-restart.show { opacity: 1; animation: eggRestartPulse 1.6s ease-in-out infinite; }
.egg-restart:hover { border-color: var(--color-red); }
.egg-restart:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }
@keyframes eggRestartPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }

/* ── Small screens ─────────────────────────────────────── */
@media (max-width: 500px) {
  .egg-surface-seams > *:nth-child(n+4) { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .egg-station-entrance { opacity: 1 !important; transform: none !important; transition: none !important; }
  .egg-station-float, .egg-spin, .egg-wander, .egg-dish-inner { animation: none !important; }
  .egg-dish-inner { opacity: 0.24; }
  .egg-recoil-once .egg-station-tilt { animation: none; }
  .egg-hit3 .egg-dish-inner { animation: none !important; opacity: 0.1; }
  .egg-hit4 .egg-dish-inner { opacity: 0.05; }
  .egg-station-jitter { animation: none !important; }
  .egg-restart.show { animation: none; }
}
`;function l(){let e=document.createElement(`div`);e.className=`egg-layer`+(n?``:` egg-idle`),e.innerHTML=`
    <div class="egg-wander">
    <div class="egg-scene">
      <div class="egg-station-entrance">
        <div class="egg-station-float">
          <div class="egg-station-tilt">
            <div class="egg-station-jitter">
              <div class="egg-station-wrap">
                <button class="egg-station-btn" type="button" aria-label="Do not shoot"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
`;let{svg:t,crackEls:r}=s();return e.querySelector(`.egg-station-btn`).appendChild(t),{layer:e,crackEls:r}}function u(){let e=document.createElement(`style`);e.textContent=c,document.head.appendChild(e);let{layer:t,crackEls:r}=l();document.body.appendChild(t);let a=t.querySelector(`.egg-scene`),o=t.querySelector(`.egg-station-btn`),s=t.querySelector(`.egg-station-wrap`),u=t.querySelector(`.egg-station-entrance`);o.tabIndex=-1;let d=document.querySelector(`#stageName .word[data-word="1"]`)?.querySelectorAll(`.ltr`)[7],f=[...document.querySelectorAll(`#stageName .word[data-word="1"] .ltr`)];function p(){if(!d)return;let e=d.getBoundingClientRect();if(!e.width||!e.height)return;let n=Math.min(e.width,e.height)*.46,r=Math.min(44,e.width*1.05),i=Math.max(n,r);t.style.setProperty(`--egg-size`,i.toFixed(0)+`px`),t.style.setProperty(`--egg-orbit-x`,(e.width*.72).toFixed(0)+`px`),t.style.left=(e.left+e.width/2-i/2).toFixed(0)+`px`,t.style.top=(e.top+e.height/2-i/2).toFixed(0)+`px`}let m=0;function h(){p();let e=o.getBoundingClientRect();for(let t of f){let n=t.getBoundingClientRect(),r=!(e.right<n.left||e.left>n.right||e.bottom<n.top||e.top>n.bottom);t.classList.toggle(`egg-ltr-dim`,r)}n||(m=requestAnimationFrame(h))}function g(){cancelAnimationFrame(m),h()}function _(){cancelAnimationFrame(m),m=0;for(let e of f)e.classList.remove(`egg-ltr-dim`)}let v=!1,y=0,b=!1;function x(){let e=document.documentElement.scrollHeight-window.innerHeight-window.scrollY<=200;e&&v&&p(),e!==v&&(e&&p(),v=e,t.classList.toggle(`egg-in`,v),o.tabIndex=v?0:-1,v&&!b?g():_())}window.addEventListener(`scroll`,x,{passive:!0}),window.addEventListener(`resize`,x,{passive:!0}),x();let S=0,C=null;window.addEventListener(`pointermove`,e=>{C={x:e.clientX,y:e.clientY}},{passive:!0});function w(e){if(b||y>=5)return;let t=performance.now?performance.now():Date.now();t-S<250||(S=t,T(e),setTimeout(j,150))}function T(e){let t=o.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2,i=n-e.x,a=r-e.y,s=Math.atan2(a,i)*180/Math.PI,c=document.createElement(`div`);c.className=`egg-bolt`,c.style.transform=`translate(${e.x}px, ${e.y}px) rotate(${s}deg)`,document.body.appendChild(c),requestAnimationFrame(()=>{c.style.transition=`transform 0.15s linear`,c.style.transform=`translate(${(e.x+i).toFixed(0)}px, ${(e.y+a).toFixed(0)}px) rotate(${s}deg)`}),setTimeout(()=>{c.remove();let e=document.createElement(`div`);e.className=`egg-ring`,e.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px)`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add(`run`)),setTimeout(()=>e.remove(),320)},150)}function E(){let e=o.getBoundingClientRect(),t=e.left+e.width/2,n=e.top+e.height/2,r={top:n,bottom:window.innerHeight-n,left:t,right:window.innerWidth-t},i=Math.min(r.top,r.bottom,r.left,r.right);return i===r.top?{x:t,y:0}:i===r.bottom?{x:t,y:window.innerHeight}:i===r.left?{x:0,y:n}:{x:window.innerWidth,y:n}}o.addEventListener(`click`,()=>{let e=o.getBoundingClientRect();w(C&&Math.hypot(C.x-(e.left+e.width/2),C.y-(e.top+e.height/2))>30?C:E())});function D(){let e=o.getBoundingClientRect(),t=e.left+e.width*.42,n=e.top+e.height*.4,r=C??E(),i=r.x-t,a=r.y-n,s=Math.hypot(i,a)||1,c=Math.atan2(a,i)*180/Math.PI,l=document.createElement(`div`);l.className=`egg-bolt egg-bolt-return`,l.style.transform=`translate(${t.toFixed(0)}px, ${n.toFixed(0)}px) rotate(${c}deg)`,document.body.appendChild(l),requestAnimationFrame(()=>{l.style.transition=`transform 0.22s linear, opacity 0.22s ease-in`,l.style.transform=`translate(${(t+i/s*(s+90)).toFixed(0)}px, ${(n+a/s*(s+90)).toFixed(0)}px) rotate(${c}deg)`,l.style.opacity=`0`}),setTimeout(()=>l.remove(),260)}let O=null,k=null;function A(e){r.forEach(t=>{Number(t.dataset.hit)===e&&t.classList.add(`show`)})}function j(){if(!(b||y>=5)){if(y+=1,t.classList.add(`egg-hit`+y),n||D(),A(y),!n){if(y===1&&(t.classList.add(`egg-recoil-once`),clearTimeout(O),O=setTimeout(()=>t.classList.remove(`egg-recoil-once`),500)),y===2){let e=document.createElement(`div`);e.className=`egg-spark-run`,e.style.position=`absolute`,e.style.left=`38%`,e.style.top=`30%`,e.innerHTML=`<span class="egg-spark egg-spark-1"></span><span class="egg-spark egg-spark-2"></span>`,s.appendChild(e),clearTimeout(k),k=setTimeout(()=>e.remove(),900)}if(y===4){let e=t.querySelectorAll(`.egg-plate`);e[1]&&e[1].classList.add(`egg-plate-detach`),e[4]&&e[4].classList.add(`egg-plate-detach`)}}y===5&&setTimeout(L,400)}}function M(e){let t=document.createElement(`div`);return t.className=`egg-fx `+e,document.body.appendChild(t),t}function N(){let e=i(`svg`,{class:`egg-fx egg-cracks-fx`}),t=window.innerWidth/2,n=window.innerHeight/2;for(let r=0;r<9;r++){let a=r/9*Math.PI*2+Math.random()*.5,o=t,s=n,c=`M ${o.toFixed(0)} ${s.toFixed(0)}`,l=5+Math.floor(Math.random()*3);for(let e=0;e<l;e++){a+=(Math.random()-.5)*.9;let t=40+Math.random()*120;if(o+=Math.cos(a)*t,s+=Math.sin(a)*t,c+=` L ${o.toFixed(0)} ${s.toFixed(0)}`,e===2&&Math.random()<.7){let e=a+(Math.random()<.5?1:-1)*(.6+Math.random()*.5),t=o+Math.cos(e)*(30+Math.random()*60),n=s+Math.sin(e)*(30+Math.random()*60);c+=` M ${o.toFixed(0)} ${s.toFixed(0)} L ${t.toFixed(0)} ${n.toFixed(0)} M ${o.toFixed(0)} ${s.toFixed(0)}`}}let u=i(`path`,{d:c,class:`egg-crack-fx`,pathLength:`1`});u.style.strokeDasharray=`1`,u.style.strokeDashoffset=`1`,u.style.transition=`stroke-dashoffset 0.7s ease-out ${(r*.08).toFixed(2)}s`,e.appendChild(u)}return document.body.appendChild(e),requestAnimationFrame(()=>requestAnimationFrame(()=>{e.querySelectorAll(`path`).forEach(e=>e.style.strokeDashoffset=`0`)})),e}function P(e,t,n,r){let i=e.getBoundingClientRect(),a=window.innerWidth/2-(i.left+i.width/2),o=window.innerHeight/2-(i.top+i.height/2);e.style.transition=`transform ${n}s cubic-bezier(0.55, -0.15, 0.75, 0.5) ${r}s, opacity 0.25s ease ${(r+n*.8).toFixed(2)}s`,e.style.transform=`translate(${a.toFixed(0)}px, ${o.toFixed(0)}px) ${t} scale(0.04)`,e.style.opacity=`0`}function F(e){let t=o.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;u.style.transformOrigin=`center center`,u.style.transition=`transform 0.55s cubic-bezier(0.7, 0, 0.85, 0.2), filter 0.5s ease-in, opacity 0.15s ease 0.5s`,u.style.filter=`brightness(3.4)`,u.style.transform=`scale(0.04)`,u.style.opacity=`0`,setTimeout(()=>e({x:n,y:r}),560)}function I(e,t){let n=e?.x??window.innerWidth/2,r=e?.y??window.innerHeight/2,i=Math.max(Math.hypot(n,r),Math.hypot(window.innerWidth-n,r),Math.hypot(n,window.innerHeight-r),Math.hypot(window.innerWidth-n,window.innerHeight-r)),a=document.createElement(`div`);a.className=`egg-singularity`,a.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(0)`,document.body.appendChild(a),requestAnimationFrame(()=>{a.style.transition=`transform 0.18s ease-out, opacity 0.12s ease-out`,a.style.opacity=`1`,a.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(1.1)`}),setTimeout(()=>{a.style.transition=`transform 0.1s ease-in, opacity 0.1s ease-in`,a.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(0)`,a.style.opacity=`0`;let e=M(`egg-flash`);e.style.transition=`opacity 0.06s linear`,requestAnimationFrame(()=>e.style.opacity=`0.92`),setTimeout(()=>{e.style.transition=`opacity 0.45s ease-out`,e.style.opacity=`0`},80),setTimeout(()=>e.remove(),600);let t=document.createElement(`div`);t.className=`egg-blast`,t.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(0.3)`,document.body.appendChild(t),requestAnimationFrame(()=>{t.style.transition=`transform 0.7s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.7s ease-in`,t.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(${(i*1.15/20).toFixed(1)})`,t.style.opacity=`0`}),setTimeout(()=>t.remove(),750),[0,90,190].forEach((e,t)=>{setTimeout(()=>{let e=document.createElement(`div`);e.className=`egg-shockwave`,e.style.setProperty(`--sw-scale`,i/10*(1+t*.35)),e.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px) scale(0.2)`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add(`run`)),setTimeout(()=>e.remove(),900)},e)});for(let e=0;e<40;e++){let t=document.createElement(`div`);t.className=`egg-ember`,t.style.color=e%5==0?`#8fc6ff`:e%3==0?`#ffd9a0`:`#ffffff`,t.style.transform=`translate(${n.toFixed(0)}px, ${r.toFixed(0)}px)`,document.body.appendChild(t);let a=Math.random()*Math.PI*2,o=i*(.5+Math.random()*.75),s=.5+Math.random()*.45;requestAnimationFrame(()=>{t.style.transition=`transform ${s}s cubic-bezier(0.1, 0.7, 0.3, 1), opacity ${s}s ease-in`,t.style.transform=`translate(${(n+Math.cos(a)*o).toFixed(0)}px, ${(r+Math.sin(a)*o).toFixed(0)}px) scale(${(.4+Math.random()*1.6).toFixed(2)})`,t.style.opacity=`0`}),setTimeout(()=>t.remove(),1100)}},330),setTimeout(()=>{a.remove(),t()},1050)}function L(){b=!0,_(),document.body.style.overflow=`hidden`,document.documentElement.style.overflow=`hidden`,o.style.pointerEvents=`none`;let e=t.querySelector(`.egg-wander`);if(e&&(e.style.animationPlayState=`paused`),n){let e=M(`egg-blackout`);e.style.transition=`opacity 0.8s ease`,requestAnimationFrame(()=>e.style.opacity=`1`),setTimeout(R,900);return}let r=document.documentElement,i=[document.getElementById(`sky`),document.querySelector(`.dotgrid`),document.querySelector(`.topbar`),document.querySelector(`main`),document.querySelector(`footer`),a].filter(Boolean);i.forEach(e=>e.classList.add(`egg-shaken`));let s=9,c=0,l=0,u=1,d=!1,f=setInterval(()=>{d&&(s=Math.min(15,s+.4),l=Math.min(4,l+.27),u=Math.min(1.08,u+.0054)),r.style.setProperty(`--egg-sx`,((Math.random()*2-1)*(s+c)).toFixed(1)+`px`),r.style.setProperty(`--egg-sy`,((Math.random()*2-1)*s).toFixed(1)+`px`),r.style.setProperty(`--egg-rot`,l.toFixed(2)+`deg`),r.style.setProperty(`--egg-scl`,u.toFixed(4))},80),p=(e,t)=>setTimeout(t,e),m=M(`egg-border-flicker`);m.classList.add(`run`),p(600,()=>m.remove());let h=document.getElementById(`stageName`);p(400,()=>h&&h.classList.add(`egg-rgb`));for(let e=0;e<5;e++)p(400+Math.random()*900,()=>{let e=document.createElement(`div`);e.className=`egg-band`,e.style.top=Math.random()*90+`vh`,e.style.height=18+Math.random()*26+`px`;let t=(20+Math.random()*40)*(Math.random()<.5?-1:1);e.style.transform=`translateX(${t}px)`,document.body.appendChild(e),c=30,setTimeout(()=>{c=0,e.remove()},100)});p(1400,()=>h&&h.classList.remove(`egg-rgb`));let g=null,v=null;p(800,()=>{g=N(),v=M(`egg-scanlines`),requestAnimationFrame(()=>v.classList.add(`show`))}),p(1200,()=>{document.querySelectorAll(`#stageName .ltr`).forEach(e=>{P(e,`rotate(${((20+Math.random()*100)*(Math.random()<.5?-1:1)).toFixed(0)}deg)`,.9,Math.random()*.4)}),document.querySelectorAll(`.topbar .pill, #contact .pill`).forEach(e=>{let t=e.getBoundingClientRect();P(e,`rotate(${(Math.atan2(window.innerHeight/2-(t.top+t.height/2),window.innerWidth/2-(t.left+t.width/2))*180/Math.PI).toFixed(0)}deg) scaleX(1.7)`,1,.15+Math.random()*.35)})});let y=M(`egg-flash`);p(2600,()=>{y.style.transition=`opacity 0.12s ease-in`,y.style.opacity=`1`,setTimeout(()=>{y.style.transition=`opacity 0.25s ease-out`,y.style.opacity=`0`},130),document.getElementById(`sky`)?.classList.add(`egg-burnout`),document.querySelector(`.dotgrid`)?.classList.add(`egg-burnout`),d=!0}),p(3600,()=>{F(e=>{clearInterval(f),i.forEach(e=>e.classList.remove(`egg-shaken`)),[`--egg-sx`,`--egg-sy`,`--egg-rot`,`--egg-scl`].forEach(e=>r.style.removeProperty(e)),g?.remove(),v?.remove(),m.remove(),y.remove(),t.remove(),I(e,()=>{let e=M(`egg-blackout`);e.style.transition=`opacity 0.5s ease`,requestAnimationFrame(()=>e.style.opacity=`1`),setTimeout(R,520)})})})}function R(){let e=document.createElement(`div`);e.className=`egg-dead`,e.innerHTML=`
      <div class="egg-dead-line"></div>
      <div class="egg-dead-line"></div>
      <button class="egg-restart" type="button">RESTART UNIVERSE</button>`,document.body.appendChild(e);let[t,n]=e.querySelectorAll(`.egg-dead-line`),r=e.querySelector(`.egg-restart`);function i(e,t,n){let r=0,i=setInterval(()=>{e.textContent=t.slice(0,++r),r>=t.length&&(clearInterval(i),n())},45)}i(t,`SIGNAL LOST`,()=>{setTimeout(()=>{i(n,`UNIVERSE UNAVAILABLE`,()=>{setTimeout(()=>{r.classList.add(`show`),r.focus()},1e3)})},600)});let a=!1;function o(){a||(a=!0,e.style.transition=`opacity 0.3s ease`,e.style.opacity=`0`,history.scrollRestoration=`manual`,window.scrollTo(0,0),setTimeout(()=>window.location.reload(),300))}r.addEventListener(`click`,o),window.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `||e.key===`Escape`)&&(e.preventDefault(),o())})}}u();