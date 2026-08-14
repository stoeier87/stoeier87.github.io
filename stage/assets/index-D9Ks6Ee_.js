import"./tailwind-BwqfsUub.js";(function(){document.documentElement.classList.add(`js-anim`);let e=document.getElementById(`starfield`),t=e.getContext(`2d`),n=0,r=0,i=1,a=[],o=[{density:22e3,sizeMin:.5,sizeMax:1,parallax:.12,alpha:.5},{density:14e3,sizeMin:1,sizeMax:1.7,parallax:.3,alpha:.7},{density:26e3,sizeMin:1.7,sizeMax:2.5,parallax:.55,alpha:.9}];function s(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}function c(){a=o.map(function(e,t){let i=Math.max(20,Math.round(n*r/e.density)),a=[];for(let o=0;o<i;o++){let i=t*1e4+o*7;a.push({x:s(i+1)*n,y:s(i+2)*r,r:e.sizeMin+s(i+3)*(e.sizeMax-e.sizeMin),phase:s(i+4)*Math.PI*2,speed:.5+s(i+5)*1.2})}return{def:e,stars:a}})}let l=[{name:`MERKUR`,r:.02,s0:.06,px:.8,pf:.42,hi:`#b8b0a8`,lo:`#5c554e`,link:`/arcade/orbit-runner`},{name:`VENUS`,r:.034,s0:.16,px:.16,pf:.5,hi:`#e8cfa0`,lo:`#a67c48`,link:`/arcade/meteor-dodge`},{name:`JORDEN`,r:.04,s0:.27,px:.83,pf:.58,hi:`#6fb6e8`,lo:`#1c4e8a`,earth:!0,link:`/arcade/iss-docking`},{name:`MARS`,r:.028,s0:.38,px:.14,pf:.46,hi:`#e0704a`,lo:`#8a3520`,link:`/arcade/phobos-lander`},{name:`JUPITER`,r:.105,s0:.52,px:.85,pf:.62,hi:`#d9b48a`,lo:`#8a6238`,bands:!0,link:`/arcade/comet-pong`},{name:`SATURN`,r:.08,s0:.67,px:.16,pf:.55,hi:`#e3c68f`,lo:`#9c7a48`,ring:!0,link:`/arcade/star-memory`},{name:`URANUS`,r:.042,s0:.8,px:.82,pf:.48,hi:`#a8e0e8`,lo:`#4a98a8`,link:`/arcade/nebula-trail`},{name:`NEPTUN`,r:.046,s0:.92,px:.15,pf:.6,hi:`#6a8ce8`,lo:`#2a3f9c`,link:`/arcade/asteroid-breaker`}],u=[],d=-1,f={visible:!1,x:0,y:0,r:0},p={x:-9999,y:-9999,inside:!1};document.addEventListener(`mousemove`,function(e){p.x=e.clientX,p.y=e.clientY,p.inside=!0},{passive:!0}),document.addEventListener(`mouseleave`,function(){p.inside=!1,d=-1},{passive:!0}),document.addEventListener(`click`,function(){if(d<0)return;let e=l[d].link;e&&(window.location.href=e)});function m(e,n,r,i){let a=t.createRadialGradient(n,r,i*.5,n,r,i*2);a.addColorStop(0,`rgba(255,255,255,0.06)`),a.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=a,t.beginPath(),t.arc(n,r,i*2,0,6.2832),t.fill(),e.ring&&(t.strokeStyle=`rgba(214, 194, 150, 0.55)`,t.lineWidth=i*.3,t.beginPath(),t.ellipse(n,r,i*1.75,i*.55,-.32,Math.PI,6.2832),t.stroke());let o=t.createRadialGradient(n-i*.35,r-i*.35,i*.1,n,r,i*1.05);o.addColorStop(0,e.hi),o.addColorStop(1,e.lo),t.fillStyle=o,t.beginPath(),t.arc(n,r,i,0,6.2832),t.fill(),(e.bands||e.earth)&&(t.save(),t.beginPath(),t.arc(n,r,i,0,6.2832),t.clip(),e.bands&&(t.fillStyle=`rgba(110, 74, 44, 0.35)`,t.fillRect(n-i,r-i*.52,i*2,i*.18),t.fillRect(n-i,r-i*.1,i*2,i*.22),t.fillRect(n-i,r+i*.38,i*2,i*.15),t.fillStyle=`rgba(200, 90, 60, 0.75)`,t.beginPath(),t.ellipse(n+i*.35,r+i*.24,i*.18,i*.11,0,0,6.2832),t.fill()),e.earth&&(t.fillStyle=`rgba(76, 156, 94, 0.85)`,t.beginPath(),t.ellipse(n-i*.3,r-i*.15,i*.42,i*.3,.5,0,6.2832),t.fill(),t.beginPath(),t.ellipse(n+i*.42,r+i*.35,i*.28,i*.2,-.4,0,6.2832),t.fill(),t.fillStyle=`rgba(255, 255, 255, 0.7)`,t.beginPath(),t.ellipse(n+i*.1,r-i*.8,i*.35,i*.18,0,0,6.2832),t.fill()),t.restore()),e.ring&&(t.strokeStyle=`rgba(224, 204, 160, 0.7)`,t.lineWidth=i*.3,t.beginPath(),t.ellipse(n,r,i*1.75,i*.55,-.32,0,Math.PI),t.stroke())}function h(e,n){if(!f.visible)return;let r=f.x,i=f.y,a=f.r,o=a*1.9,s=n*.0012,c=r+Math.cos(s)*o,l=i+Math.sin(s)*o*.75;t.strokeStyle=`rgba(200,230,255,0.20)`,t.lineWidth=1,t.beginPath(),t.ellipse(r,i,o,o*.75,0,0,Math.PI*2),t.stroke();let u=.6+.4*Math.sin(n*.006),d=t.createRadialGradient(c,l,0,c,l,10);d.addColorStop(0,`rgba(235,245,255,`+(.5*u).toFixed(3)+`)`),d.addColorStop(1,`rgba(235,245,255,0)`),t.fillStyle=d,t.beginPath(),t.arc(c,l,10,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(255,255,255,`+(.88*u).toFixed(3)+`)`,t.fillRect(c-1.1,l-.75,2.2,1.5),t.fillRect(c-4,l-.42,2.2,.84),t.fillRect(c+1.8,l-.42,2.2,.84);let p=a*2.7,m=Math.max(1.8,a*.18),h=n*45e-5,g=r+Math.cos(h)*p,_=i+Math.sin(h)*p*.75;t.strokeStyle=`rgba(210,220,245,0.17)`,t.lineWidth=1,t.beginPath(),t.ellipse(r,i,p,p*.75,0,0,Math.PI*2),t.stroke();let v=t.createRadialGradient(g,_,0,g,_,m*4);v.addColorStop(0,`rgba(240,245,255,0.25)`),v.addColorStop(1,`rgba(240,245,255,0)`),t.fillStyle=v,t.beginPath(),t.arc(g,_,m*4,0,Math.PI*2),t.fill();let y=t.createRadialGradient(g-m*.35,_-m*.35,0,g,_,m*1.2);y.addColorStop(0,`#f4f4f6`),y.addColorStop(1,`#9ca3ad`),t.fillStyle=y,t.beginPath(),t.arc(g,_,m,0,Math.PI*2),t.fill()}function g(e,t){let i=Math.min(n,r),a=P;u.length=0,f.visible=!1;for(let t=0;t<l.length;t++){let o=l[t],s=o.r*i,c=r*.55+o.s0*a*o.pf-e*o.pf,d=o.px*n;c<-s*3||c>r+s*3||(m(o,d,c,s),u.push({idx:t,x:d,y:c,r:s}),o.earth&&(f.visible=!0,f.x=d,f.y=c,f.r=s))}h(e,t)}let _=[],v=[],y=0;function b(e){y=e+(1800+Math.random()*4700)}function x(){let e=Math.random()*n*.6-n*.2,t=Math.random()*r*.35,i=650+Math.random()*550,a=90+Math.random()*120,o=(25+Math.random()*20)*(Math.PI/180);_.push({x:e,y:t,vx:Math.cos(o)*i,vy:Math.sin(o)*i,life:0,ttl:700+Math.random()*450,len:a,width:1+Math.random()*1.2})}function S(e,t){t>=y&&_.length<3&&(x(),b(t));for(let t=_.length-1;t>=0;t--){let i=_[t];i.life+=e,i.x+=i.vx*(e/1e3),i.y+=i.vy*(e/1e3),(i.life>i.ttl||i.x>n+i.len||i.y>r+i.len)&&_.splice(t,1)}}function C(){for(let e=0;e<_.length;e++){let n=_[e],r=1-n.life/n.ttl,i=Math.hypot(n.vx,n.vy)||1,a=n.x-n.vx/i*n.len,o=n.y-n.vy/i*n.len,s=t.createLinearGradient(n.x,n.y,a,o);s.addColorStop(0,`rgba(255,255,255,`+(.95*r).toFixed(3)+`)`),s.addColorStop(.35,`rgba(180,220,255,`+(.45*r).toFixed(3)+`)`),s.addColorStop(1,`rgba(180,220,255,0)`),t.strokeStyle=s,t.lineWidth=n.width,t.beginPath(),t.moveTo(n.x,n.y),t.lineTo(a,o),t.stroke()}}function w(){let e=Math.random()>.5,t=r*(.1+Math.random()*.45),i=18+Math.random()*26;return{x:e?-40:n+40,y:t,vx:e?i:-i,vy:(Math.random()-.5)*2.2,size:1.3+Math.random()*1.1,blinkPhase:Math.random()*Math.PI*2,blinkSpeed:.006+Math.random()*.005,glow:.55+Math.random()*.25}}function T(){v.length=0;for(let e=0;e<5;e++)v.push(w())}function E(e,t){for(let i=v.length-1;i>=0;i--){let a=v[i];a.x+=a.vx*(e/1e3),a.y+=a.vy*(e/1e3),a.y+=Math.sin((t+a.blinkPhase*2e3)*35e-5)*.02,(a.x<-80||a.x>n+80||a.y<-40||a.y>r+40)&&(v[i]=w())}}function ee(e){for(let n=0;n<v.length;n++){let r=v[n],i=.55+.45*Math.sin(e*r.blinkSpeed+r.blinkPhase),a=r.glow*i,o=t.createRadialGradient(r.x,r.y,0,r.x,r.y,r.size*6);o.addColorStop(0,`rgba(220,240,255,`+(.45*a).toFixed(3)+`)`),o.addColorStop(1,`rgba(220,240,255,0)`),t.fillStyle=o,t.beginPath(),t.arc(r.x,r.y,r.size*6,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(210,230,255,`+a.toFixed(3)+`)`,t.beginPath(),t.arc(r.x,r.y,r.size,0,Math.PI*2),t.fill()}}function te(){if(!p.inside){d=-1;return}let e=-1;for(let t=u.length-1;t>=0;t--){let n=u[t],r=p.x-n.x,i=p.y-n.y;if(r*r+i*i<=n.r*n.r){e=n.idx;break}}d=e}function D(e,i){t.clearRect(0,0,n,r);for(let n=0;n<a.length;n++){let o=a[n],s=o.def,c=e*s.parallax;for(let e=0;e<o.stars.length;e++){let n=o.stars[e],a=(n.y-c)%r;a<0&&(a+=r);let l=.65+.35*Math.sin(i*.001*n.speed+n.phase);t.globalAlpha=s.alpha*l,t.fillStyle=`#ffffff`,t.beginPath(),t.arc(n.x,a,n.r,0,6.2832),t.fill()}}t.globalAlpha=1;let o=Math.min(64,i-(D._lastTime||i));S(o,i),C(),E(o,i),ee(i),g(e,i),te(),D._lastTime=i}let O=document.querySelector(`.journey`),k=document.getElementById(`hint`),A=document.getElementById(`contact`),j=document.getElementById(`arcadePills`),M=document.getElementById(`stageName`),N=[],P=1,F=-1,I=-1,L=[[.03,.3],[.36,.62],[.68,.9]];function ne(){let e=document.querySelectorAll(`#stageName .word`),t=0;e.forEach(function(e,n){let r=Array.from(e.textContent);e.textContent=``;let i=r.length;r.forEach(function(r,a){let o=document.createElement(`span`);o.className=`ltr`,o.textContent=r,e.appendChild(o);let c=L[n][0],l=L[n][1]-c,u=t*13+5,d=s(u+1)*Math.PI*2,f=Math.max(window.innerWidth,window.innerHeight);N.push({el:o,t0:c+a/i*l*.65,dur:l*.35,dx:Math.cos(d)*(.55+s(u+2)*.7)*f,dy:Math.sin(d)*(.55+s(u+3)*.7)*f,scale:.3+s(u+4)*2.4,rot:(s(u+5)-.5)*90,last:-1}),t++}),e.style.visibility=`visible`})}function R(e){return 1-(1-e)**3}function z(e){for(let t=0;t<N.length;t++){let n=N[t],r=(e-n.t0)/n.dur;if(r=r<0?0:r>1?1:r,r===n.last)continue;n.last=r;let i=R(r),a=1-i;n.el.style.transform=`translate3d(`+(n.dx*a).toFixed(1)+`px,`+(n.dy*a).toFixed(1)+`px,0) rotate(`+(n.rot*a).toFixed(2)+`deg) scale(`+(n.scale+(1-n.scale)*i).toFixed(3)+`)`,n.el.style.opacity=Math.min(1,i*1.8).toFixed(3)}if(M){let t=(1-e)*38;M.style.transform=`translate3d(0,`+t.toFixed(1)+`px,0)`}k&&(k.style.opacity=e>.02?`0`:`1`);let t=(e-.92)/.07;if(t=t<0?0:t>1?1:t,j&&t!==I){I=t;let e=R(t);j.style.opacity=e.toFixed(3),j.style.transform=`translateY(`+(-40*(1-e)).toFixed(1)+`px)`,j.style.pointerEvents=t>.5?`auto`:`none`}if(A&&t!==F){F=t;let e=R(t);A.style.opacity=e.toFixed(3),A.style.transform=`translateY(`+(40*(1-e)).toFixed(1)+`px)`,A.style.pointerEvents=t>.5?`auto`:`none`}}let B=window.scrollY||0,V=!0;function H(){i=Math.min(window.devicePixelRatio||1,2),n=window.innerWidth,r=window.innerHeight,e.width=Math.round(n*i),e.height=Math.round(r*i),t.setTransform(i,0,0,i,0,0),c(),T(),b(performance.now()),O&&(P=Math.max(1,O.offsetHeight-r));let a=document.querySelector(`.topbar`);a&&document.documentElement.style.setProperty(`--topbar-h`,a.offsetHeight+`px`),V=!0}let U=[];function re(){let e=document.querySelector(`.stage`);for(let t=0;t<4;t++){let t=document.createElement(`span`);t.className=`title-sat`,e.appendChild(t),U.push({el:t,a:Math.random()*Math.PI*2,speed:6e-4+Math.random()*7e-4,rx:140+Math.random()*120,ry:45+Math.random()*40})}}function ie(e){if(!M)return;let t=M.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;for(let t=0;t<U.length;t++){let i=U[t],a=i.a+e*i.speed,o=n+Math.cos(a)*i.rx,s=r+Math.sin(a)*i.ry;i.el.style.transform=`translate3d(`+o.toFixed(1)+`px,`+s.toFixed(1)+`px,0)`}}window.addEventListener(`scroll`,function(){B=window.scrollY,V=!0},{passive:!0}),window.addEventListener(`resize`,H,{passive:!0}),H();let W=document.getElementById(`ufo`),G=window.matchMedia(`(pointer: fine)`).matches,K=-100,q=-100,J=-100,Y=-100,X=0;G&&W&&(document.documentElement.classList.add(`ufo-on`),document.addEventListener(`mousemove`,function(e){J=e.clientX,Y=e.clientY,W.classList.contains(`live`)||(K=J,q=Y,W.classList.add(`live`))},{passive:!0}),document.querySelectorAll(`a`).forEach(function(e){e.addEventListener(`mouseenter`,function(){W.classList.add(`zap`)}),e.addEventListener(`mouseleave`,function(){W.classList.remove(`zap`)})}));function ae(){let e=J-K;K+=e*.18,q+=(Y-q)*.18;let t=Math.max(-22,Math.min(22,e*.6));X+=(t-X)*.15,W.style.transform=`translate3d(`+(K-24).toFixed(1)+`px,`+(q-18).toFixed(1)+`px,0) rotate(`+X.toFixed(2)+`deg)`;let n=document.querySelector(`.pills`);if(n){let e=n.querySelectorAll(`.pill`),t=!1;for(let n=0;n<e.length;n++){let r=e[n].getBoundingClientRect(),i=r.top-80,a=r.bottom+80,o=r.left,s=r.right;if(K+24>=o&&K+24<=s&&q+18>=i&&q+18<=a){t=!0;break}}t?W.classList.add(`zap`):W.classList.remove(`zap`)}}let Z=window.matchMedia(`(prefers-reduced-motion: reduce)`),Q=Z.matches;function $(){document.documentElement.classList.toggle(`static-home`,Q),Q?z(1):V=!0}function oe(){let e=Z.matches;e!==Q&&(Q=e,$())}Z.addEventListener(`change`,oe),ne(),re(),$(),Q||z(0);let se=G&&W;(function e(t){if(D(B,t),V&&!Q){V=!1;let e=B/P;z(e<0?0:e>1?1:e)}ie(t),se&&ae(),requestAnimationFrame(e)})(0)})();var e=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,t=`
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
`,n=`
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
</svg>`,r=`
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
</svg>`;function i(){let t=document.createElement(`div`);return t.className=`egg-layer`+(e?``:` egg-idle`),t.innerHTML=`
    <div class="egg-drift">
    <div class="egg-scene">
      <div class="egg-bubble" role="status" aria-live="polite"></div>
      <div class="egg-console-wrap">
        ${r}
        <button class="egg-button" type="button" aria-label="Do not push"></button>
        <div class="egg-label">Do not push</div>
      </div>
      <div class="egg-alien-float"><div class="egg-alien-tilt"><div class="egg-alien-turn">${n}</div></div></div>
    </div>
    </div>`,t}function a(){let n=document.createElement(`style`);n.textContent=t,document.head.appendChild(n);let r=i();document.body.appendChild(r);let a=r.querySelector(`.egg-scene`),o=r.querySelector(`.egg-bubble`),s=r.querySelector(`.egg-button`);s.tabIndex=-1;function c(){let e=document.getElementById(`stageName`);if(!e)return;let t=e.getBoundingClientRect(),n=a.offsetHeight||120,i=t.top+t.height/2-n/2;i=Math.max(8,Math.min(i,window.innerHeight-n-8)),r.style.top=i.toFixed(0)+`px`,r.style.bottom=`auto`}let l=!1,u=0;function d(){let e=document.documentElement.scrollHeight-window.innerHeight-window.scrollY<=200;e&&l&&c(),e!==l&&(e&&c(),l=e,r.classList.toggle(`egg-in`,l),s.tabIndex=l?0:-1,l||_(!0),l&&!p&&u===0&&(p=!0,setTimeout(()=>{l&&u===0&&(g(f),h=setTimeout(()=>_(!1),4500))},500)))}window.addEventListener(`scroll`,d,{passive:!0}),window.addEventListener(`resize`,d,{passive:!0}),d();let f=`Whatever you do, do not click the button.`,p=!1,m=null,h=null;function g(e){clearInterval(m),clearTimeout(h),o.textContent=``,o.classList.add(`show`);let t=0;m=setInterval(()=>{o.textContent=e.slice(0,++t),t>=e.length&&clearInterval(m)},40)}function _(e){clearInterval(m),clearTimeout(h),o.classList.remove(`show`),e&&(o.textContent=``)}a.addEventListener(`click`,e=>{e.target!==s&&s.click()}),a.addEventListener(`mouseenter`,()=>{l&&u===0&&g(f)}),a.addEventListener(`mouseleave`,()=>{u===0&&(h=setTimeout(()=>_(!1),600))}),s.addEventListener(`focus`,()=>{l&&u===0&&g(f)});let v=null,y=null;function b(){clearTimeout(h),h=setTimeout(()=>_(!1),2500)}s.addEventListener(`click`,()=>{!l||u>=4||(u+=1,u===1?(g(`Don't.`),b(),r.classList.add(`egg-recoil`,`egg-eyes-bright`),clearTimeout(v),clearTimeout(y),v=setTimeout(()=>r.classList.remove(`egg-recoil`),500),y=setTimeout(()=>r.classList.remove(`egg-eyes-bright`),900)):u===2?(g(`I said don't.`),b(),r.classList.remove(`egg-recoil`,`egg-eyes-bright`),r.classList.add(`egg-press2plus`)):u===3?(g(`Do you know how long that took to build.`),b(),r.classList.add(`egg-press3`)):(r.classList.remove(`egg-press3`),r.classList.add(`egg-press4`),g(`Fine.`),clearTimeout(h),setTimeout(w,400)))});function x(e){let t=document.createElement(`div`);return t.className=`egg-fx `+e,document.body.appendChild(t),t}function S(){let e=`http://www.w3.org/2000/svg`,t=document.createElementNS(e,`svg`);t.setAttribute(`class`,`egg-fx egg-cracks`);let n=window.innerWidth/2,r=window.innerHeight/2;for(let i=0;i<9;i++){let a=i/9*Math.PI*2+Math.random()*.5,o=n,s=r,c=`M ${o.toFixed(0)} ${s.toFixed(0)}`,l=5+Math.floor(Math.random()*3);for(let e=0;e<l;e++){a+=(Math.random()-.5)*.9;let t=40+Math.random()*120;if(o+=Math.cos(a)*t,s+=Math.sin(a)*t,c+=` L ${o.toFixed(0)} ${s.toFixed(0)}`,e===2&&Math.random()<.7){let e=a+(Math.random()<.5?1:-1)*(.6+Math.random()*.5),t=o+Math.cos(e)*(30+Math.random()*60),n=s+Math.sin(e)*(30+Math.random()*60);c+=` M ${o.toFixed(0)} ${s.toFixed(0)} L ${t.toFixed(0)} ${n.toFixed(0)} M ${o.toFixed(0)} ${s.toFixed(0)}`}}let u=document.createElementNS(e,`path`);u.setAttribute(`d`,c),u.setAttribute(`class`,`egg-crack`),u.setAttribute(`pathLength`,`1`),u.style.strokeDasharray=`1`,u.style.strokeDashoffset=`1`,u.style.transition=`stroke-dashoffset 0.7s ease-out ${(i*.08).toFixed(2)}s`,t.appendChild(u)}return document.body.appendChild(t),requestAnimationFrame(()=>requestAnimationFrame(()=>{t.querySelectorAll(`path`).forEach(e=>e.style.strokeDashoffset=`0`)})),t}function C(e,t,n,r){let i=e.getBoundingClientRect(),a=window.innerWidth/2-(i.left+i.width/2),o=window.innerHeight/2-(i.top+i.height/2);e.style.transition=`transform ${n}s cubic-bezier(0.55, -0.15, 0.75, 0.5) ${r}s, opacity 0.25s ease ${(r+n*.8).toFixed(2)}s`,e.style.transform=`translate(${a.toFixed(0)}px, ${o.toFixed(0)}px) ${t} scale(0.04)`,e.style.opacity=`0`}function w(){if(_(!0),document.body.style.overflow=`hidden`,e){let e=x(`egg-blackout`);e.style.transition=`opacity 0.8s ease`,requestAnimationFrame(()=>e.style.opacity=`1`),setTimeout(()=>T(e),900);return}let t=r.querySelector(`.egg-drift`);t&&(t.style.animationPlayState=`paused`);let n=document.documentElement,i=[document.getElementById(`starfield`),document.querySelector(`.dotgrid`),document.querySelector(`.topbar`),document.querySelector(`main`),document.querySelector(`footer`),a].filter(Boolean);i.forEach(e=>e.classList.add(`egg-shaken`));let s=9,c=0,l=0,u=1,d=!1,f=setInterval(()=>{d&&(s=Math.min(15,s+.4),l=Math.min(4,l+.27),u=Math.min(1.08,u+.0054)),n.style.setProperty(`--egg-sx`,((Math.random()*2-1)*(s+c)).toFixed(1)+`px`),n.style.setProperty(`--egg-sy`,((Math.random()*2-1)*s).toFixed(1)+`px`),n.style.setProperty(`--egg-rot`,l.toFixed(2)+`deg`),n.style.setProperty(`--egg-scl`,u.toFixed(4))},80),p=(e,t)=>setTimeout(t,e),m=x(`egg-border-flicker`);m.classList.add(`run`),p(600,()=>m.remove());let h=document.getElementById(`stageName`);p(400,()=>h&&h.classList.add(`egg-rgb`));for(let e=0;e<5;e++)p(400+Math.random()*900,()=>{let e=document.createElement(`div`);e.className=`egg-band`,e.style.top=Math.random()*90+`vh`,e.style.height=18+Math.random()*26+`px`;let t=(20+Math.random()*40)*(Math.random()<.5?-1:1);e.style.transform=`translateX(${t}px)`,document.body.appendChild(e),c=30,setTimeout(()=>{c=0,e.remove()},100)});p(1400,()=>h&&h.classList.remove(`egg-rgb`));let v=null,y=null;p(800,()=>{v=S(),y=x(`egg-scanlines`),requestAnimationFrame(()=>y.classList.add(`show`))}),p(1200,()=>{document.querySelectorAll(`#stageName .ltr`).forEach(e=>{C(e,`rotate(${((20+Math.random()*100)*(Math.random()<.5?-1:1)).toFixed(0)}deg)`,.9,Math.random()*.4)}),document.querySelectorAll(`.topbar .pill, #contact .pill`).forEach(e=>{let t=e.getBoundingClientRect();C(e,`rotate(${(Math.atan2(window.innerHeight/2-(t.top+t.height/2),window.innerWidth/2-(t.left+t.width/2))*180/Math.PI).toFixed(0)}deg) scaleX(1.7)`,1,.15+Math.random()*.35)})});let b=x(`egg-flash`);p(2600,()=>{b.style.transition=`opacity 0.12s ease-in`,b.style.opacity=`1`,setTimeout(()=>{b.style.transition=`opacity 0.25s ease-out`,b.style.opacity=`0`},130),document.getElementById(`starfield`).classList.add(`egg-burnout`),document.querySelector(`.dotgrid`)?.classList.add(`egg-burnout`),d=!0}),p(3550,()=>{o.style.position=`fixed`,o.style.left=`50%`,o.style.right=`auto`,o.style.bottom=`auto`,o.style.top=`16%`,o.style.transform=`translateX(-50%)`,o.style.zIndex=`395`,document.body.appendChild(o),g(`Told you.`)}),p(3600,()=>{let e=r.querySelector(`.egg-alien-float`),t=r.querySelector(`.egg-console-wrap`),n=e.getBoundingClientRect(),i=window.innerWidth/2-(n.left+n.width/2),a=window.innerHeight/2-(n.top+n.height/2),o=Math.min(5.5,Math.max(3,window.innerHeight/190));e.style.animation=`none`,e.firstElementChild.style.animation=`none`,e.offsetWidth,e.style.transition=`transform 0.55s cubic-bezier(0.5, 0, 0.6, 1)`,e.style.transform=`translate(${i.toFixed(0)}px, ${a.toFixed(0)}px) rotate(360deg) scale(${o.toFixed(2)})`,t.style.animation=`eggConsoleOut 0.5s cubic-bezier(0.55, -0.15, 0.75, 0.5) 0.12s forwards`});let w=x(`egg-blackout`);p(4200,()=>{_(!0),b.style.transition=`opacity 0.1s ease-in`,b.style.opacity=`1`,setTimeout(()=>{w.style.transition=`opacity 0.4s ease`,w.style.opacity=`1`,b.style.transition=`opacity 0.4s ease`,b.style.opacity=`0`},250)}),p(4700,()=>{clearInterval(f),i.forEach(e=>e.classList.remove(`egg-shaken`)),[`--egg-sx`,`--egg-sy`,`--egg-rot`,`--egg-scl`].forEach(e=>n.style.removeProperty(e)),v?.remove(),y?.remove(),m.remove(),b.remove()}),p(5e3,()=>T(w))}function T(){let e=document.createElement(`div`);e.className=`egg-dead`,e.innerHTML=`
      <div class="egg-dead-line"></div>
      <div class="egg-dead-line"></div>
      <button class="egg-restart" type="button">RESTART UNIVERSE</button>`,document.body.appendChild(e);let[t,n]=e.querySelectorAll(`.egg-dead-line`),r=e.querySelector(`.egg-restart`);function i(e,t,n){let r=0,i=setInterval(()=>{e.textContent=t.slice(0,++r),r>=t.length&&(clearInterval(i),n())},45)}i(t,`SIGNAL LOST`,()=>{setTimeout(()=>{i(n,`UNIVERSE UNAVAILABLE`,()=>{setTimeout(()=>{r.classList.add(`show`),r.focus()},1e3)})},600)});let a=!1;function o(){a||(a=!0,e.style.transition=`opacity 0.3s ease`,e.style.opacity=`0`,history.scrollRestoration=`manual`,window.scrollTo(0,0),setTimeout(()=>window.location.reload(),300))}r.addEventListener(`click`,o),window.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `||e.key===`Escape`)&&(e.preventDefault(),o())})}}a();