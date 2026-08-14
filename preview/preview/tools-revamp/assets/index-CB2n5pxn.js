import"./tailwind-BwqfsUub.js";(function(){document.documentElement.classList.add(`js-anim`);let e=document.getElementById(`starfield`),t=e.getContext(`2d`),n=0,r=0,i=1,a=[],o=[{density:22e3,sizeMin:.5,sizeMax:1,parallax:.12,alpha:.5},{density:14e3,sizeMin:1,sizeMax:1.7,parallax:.3,alpha:.7},{density:26e3,sizeMin:1.7,sizeMax:2.5,parallax:.55,alpha:.9}];function s(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}function c(){a=o.map(function(e,t){let i=Math.max(20,Math.round(n*r/e.density)),a=[];for(let o=0;o<i;o++){let i=t*1e4+o*7;a.push({x:s(i+1)*n,y:s(i+2)*r,r:e.sizeMin+s(i+3)*(e.sizeMax-e.sizeMin),phase:s(i+4)*Math.PI*2,speed:.5+s(i+5)*1.2})}return{def:e,stars:a}})}let l=[{name:`MERKUR`,r:.02,s0:.06,px:.8,pf:.42,hi:`#b8b0a8`,lo:`#5c554e`,link:`/arcade/orbit-runner`},{name:`VENUS`,r:.034,s0:.16,px:.16,pf:.5,hi:`#e8cfa0`,lo:`#a67c48`,link:`/arcade/meteor-dodge`},{name:`JORDEN`,r:.04,s0:.27,px:.83,pf:.58,hi:`#6fb6e8`,lo:`#1c4e8a`,earth:!0,link:`/arcade/iss-docking`},{name:`MARS`,r:.028,s0:.38,px:.14,pf:.46,hi:`#e0704a`,lo:`#8a3520`,link:`/arcade/phobos-lander`},{name:`JUPITER`,r:.105,s0:.52,px:.85,pf:.62,hi:`#d9b48a`,lo:`#8a6238`,bands:!0,link:`/arcade/comet-pong`},{name:`SATURN`,r:.08,s0:.67,px:.16,pf:.55,hi:`#e3c68f`,lo:`#9c7a48`,ring:!0,link:`/arcade/star-memory`},{name:`URANUS`,r:.042,s0:.8,px:.82,pf:.48,hi:`#a8e0e8`,lo:`#4a98a8`,link:`/arcade/nebula-trail`},{name:`NEPTUN`,r:.046,s0:.92,px:.15,pf:.6,hi:`#6a8ce8`,lo:`#2a3f9c`,link:`/arcade/asteroid-breaker`}],u=[],d=-1,f={visible:!1,x:0,y:0,r:0},p={x:-9999,y:-9999,inside:!1};document.addEventListener(`mousemove`,function(e){p.x=e.clientX,p.y=e.clientY,p.inside=!0},{passive:!0}),document.addEventListener(`mouseleave`,function(){p.inside=!1,d=-1},{passive:!0}),document.addEventListener(`click`,function(){if(d<0)return;let e=l[d].link;e&&(window.location.href=e)});function m(e,n,r,i){let a=t.createRadialGradient(n,r,i*.5,n,r,i*2);a.addColorStop(0,`rgba(255,255,255,0.06)`),a.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=a,t.beginPath(),t.arc(n,r,i*2,0,6.2832),t.fill(),e.ring&&(t.strokeStyle=`rgba(214, 194, 150, 0.55)`,t.lineWidth=i*.3,t.beginPath(),t.ellipse(n,r,i*1.75,i*.55,-.32,Math.PI,6.2832),t.stroke());let o=t.createRadialGradient(n-i*.35,r-i*.35,i*.1,n,r,i*1.05);o.addColorStop(0,e.hi),o.addColorStop(1,e.lo),t.fillStyle=o,t.beginPath(),t.arc(n,r,i,0,6.2832),t.fill(),(e.bands||e.earth)&&(t.save(),t.beginPath(),t.arc(n,r,i,0,6.2832),t.clip(),e.bands&&(t.fillStyle=`rgba(110, 74, 44, 0.35)`,t.fillRect(n-i,r-i*.52,i*2,i*.18),t.fillRect(n-i,r-i*.1,i*2,i*.22),t.fillRect(n-i,r+i*.38,i*2,i*.15),t.fillStyle=`rgba(200, 90, 60, 0.75)`,t.beginPath(),t.ellipse(n+i*.35,r+i*.24,i*.18,i*.11,0,0,6.2832),t.fill()),e.earth&&(t.fillStyle=`rgba(76, 156, 94, 0.85)`,t.beginPath(),t.ellipse(n-i*.3,r-i*.15,i*.42,i*.3,.5,0,6.2832),t.fill(),t.beginPath(),t.ellipse(n+i*.42,r+i*.35,i*.28,i*.2,-.4,0,6.2832),t.fill(),t.fillStyle=`rgba(255, 255, 255, 0.7)`,t.beginPath(),t.ellipse(n+i*.1,r-i*.8,i*.35,i*.18,0,0,6.2832),t.fill()),t.restore()),e.ring&&(t.strokeStyle=`rgba(224, 204, 160, 0.7)`,t.lineWidth=i*.3,t.beginPath(),t.ellipse(n,r,i*1.75,i*.55,-.32,0,Math.PI),t.stroke())}function h(e,n){if(!f.visible)return;let r=f.x,i=f.y,a=f.r,o=a*1.9,s=n*.0012,c=r+Math.cos(s)*o,l=i+Math.sin(s)*o*.75;t.strokeStyle=`rgba(200,230,255,0.20)`,t.lineWidth=1,t.beginPath(),t.ellipse(r,i,o,o*.75,0,0,Math.PI*2),t.stroke();let u=.6+.4*Math.sin(n*.006),d=t.createRadialGradient(c,l,0,c,l,10);d.addColorStop(0,`rgba(235,245,255,`+(.5*u).toFixed(3)+`)`),d.addColorStop(1,`rgba(235,245,255,0)`),t.fillStyle=d,t.beginPath(),t.arc(c,l,10,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(255,255,255,`+(.88*u).toFixed(3)+`)`,t.fillRect(c-1.1,l-.75,2.2,1.5),t.fillRect(c-4,l-.42,2.2,.84),t.fillRect(c+1.8,l-.42,2.2,.84);let p=a*2.7,m=Math.max(1.8,a*.18),h=n*45e-5,g=r+Math.cos(h)*p,_=i+Math.sin(h)*p*.75;t.strokeStyle=`rgba(210,220,245,0.17)`,t.lineWidth=1,t.beginPath(),t.ellipse(r,i,p,p*.75,0,0,Math.PI*2),t.stroke();let v=t.createRadialGradient(g,_,0,g,_,m*4);v.addColorStop(0,`rgba(240,245,255,0.25)`),v.addColorStop(1,`rgba(240,245,255,0)`),t.fillStyle=v,t.beginPath(),t.arc(g,_,m*4,0,Math.PI*2),t.fill();let y=t.createRadialGradient(g-m*.35,_-m*.35,0,g,_,m*1.2);y.addColorStop(0,`#f4f4f6`),y.addColorStop(1,`#9ca3ad`),t.fillStyle=y,t.beginPath(),t.arc(g,_,m,0,Math.PI*2),t.fill()}function g(e,t){let i=Math.min(n,r),a=N;u.length=0,f.visible=!1;for(let t=0;t<l.length;t++){let o=l[t],s=o.r*i,c=r*.55+o.s0*a*o.pf-e*o.pf,d=o.px*n;c<-s*3||c>r+s*3||(m(o,d,c,s),u.push({idx:t,x:d,y:c,r:s}),o.earth&&(f.visible=!0,f.x=d,f.y=c,f.r=s))}h(e,t)}let _=[],v=[],y=0;function b(e){y=e+(1800+Math.random()*4700)}function x(){let e=Math.random()*n*.6-n*.2,t=Math.random()*r*.35,i=650+Math.random()*550,a=90+Math.random()*120,o=(25+Math.random()*20)*(Math.PI/180);_.push({x:e,y:t,vx:Math.cos(o)*i,vy:Math.sin(o)*i,life:0,ttl:700+Math.random()*450,len:a,width:1+Math.random()*1.2})}function S(e,t){t>=y&&_.length<3&&(x(),b(t));for(let t=_.length-1;t>=0;t--){let i=_[t];i.life+=e,i.x+=i.vx*(e/1e3),i.y+=i.vy*(e/1e3),(i.life>i.ttl||i.x>n+i.len||i.y>r+i.len)&&_.splice(t,1)}}function C(){for(let e=0;e<_.length;e++){let n=_[e],r=1-n.life/n.ttl,i=Math.hypot(n.vx,n.vy)||1,a=n.x-n.vx/i*n.len,o=n.y-n.vy/i*n.len,s=t.createLinearGradient(n.x,n.y,a,o);s.addColorStop(0,`rgba(255,255,255,`+(.95*r).toFixed(3)+`)`),s.addColorStop(.35,`rgba(180,220,255,`+(.45*r).toFixed(3)+`)`),s.addColorStop(1,`rgba(180,220,255,0)`),t.strokeStyle=s,t.lineWidth=n.width,t.beginPath(),t.moveTo(n.x,n.y),t.lineTo(a,o),t.stroke()}}function w(){let e=Math.random()>.5,t=r*(.1+Math.random()*.45),i=18+Math.random()*26;return{x:e?-40:n+40,y:t,vx:e?i:-i,vy:(Math.random()-.5)*2.2,size:1.3+Math.random()*1.1,blinkPhase:Math.random()*Math.PI*2,blinkSpeed:.006+Math.random()*.005,glow:.55+Math.random()*.25}}function T(){v.length=0;for(let e=0;e<5;e++)v.push(w())}function ee(e,t){for(let i=v.length-1;i>=0;i--){let a=v[i];a.x+=a.vx*(e/1e3),a.y+=a.vy*(e/1e3),a.y+=Math.sin((t+a.blinkPhase*2e3)*35e-5)*.02,(a.x<-80||a.x>n+80||a.y<-40||a.y>r+40)&&(v[i]=w())}}function te(e){for(let n=0;n<v.length;n++){let r=v[n],i=.55+.45*Math.sin(e*r.blinkSpeed+r.blinkPhase),a=r.glow*i,o=t.createRadialGradient(r.x,r.y,0,r.x,r.y,r.size*6);o.addColorStop(0,`rgba(220,240,255,`+(.45*a).toFixed(3)+`)`),o.addColorStop(1,`rgba(220,240,255,0)`),t.fillStyle=o,t.beginPath(),t.arc(r.x,r.y,r.size*6,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(210,230,255,`+a.toFixed(3)+`)`,t.beginPath(),t.arc(r.x,r.y,r.size,0,Math.PI*2),t.fill()}}function ne(){if(!p.inside){d=-1;return}let e=-1;for(let t=u.length-1;t>=0;t--){let n=u[t],r=p.x-n.x,i=p.y-n.y;if(r*r+i*i<=n.r*n.r){e=n.idx;break}}d=e}function E(e,i){t.clearRect(0,0,n,r);for(let n=0;n<a.length;n++){let o=a[n],s=o.def,c=e*s.parallax;for(let e=0;e<o.stars.length;e++){let n=o.stars[e],a=(n.y-c)%r;a<0&&(a+=r);let l=.65+.35*Math.sin(i*.001*n.speed+n.phase);t.globalAlpha=s.alpha*l,t.fillStyle=`#ffffff`,t.beginPath(),t.arc(n.x,a,n.r,0,6.2832),t.fill()}}t.globalAlpha=1;let o=Math.min(64,i-(E._lastTime||i));S(o,i),C(),ee(o,i),te(i),g(e,i),ne(),E._lastTime=i}let D=document.querySelector(`.journey`),O=document.getElementById(`hint`),k=document.getElementById(`contact`),A=document.getElementById(`arcadePills`),j=document.getElementById(`stageName`),M=[],N=1,P=-1,F=-1,I=[[.03,.3],[.36,.62],[.68,.9]];function L(){let e=document.querySelectorAll(`#stageName .word`),t=0;e.forEach(function(e,n){let r=Array.from(e.textContent);e.textContent=``;let i=r.length;r.forEach(function(r,a){let o=document.createElement(`span`);o.className=`ltr`,o.textContent=r,e.appendChild(o);let c=I[n][0],l=I[n][1]-c,u=t*13+5,d=s(u+1)*Math.PI*2,f=Math.max(window.innerWidth,window.innerHeight);M.push({el:o,t0:c+a/i*l*.65,dur:l*.35,dx:Math.cos(d)*(.55+s(u+2)*.7)*f,dy:Math.sin(d)*(.55+s(u+3)*.7)*f,scale:.3+s(u+4)*2.4,rot:(s(u+5)-.5)*90,last:-1}),t++}),e.style.visibility=`visible`})}function R(e){return 1-(1-e)**3}function z(e){for(let t=0;t<M.length;t++){let n=M[t],r=(e-n.t0)/n.dur;if(r=r<0?0:r>1?1:r,r===n.last)continue;n.last=r;let i=R(r),a=1-i;n.el.style.transform=`translate3d(`+(n.dx*a).toFixed(1)+`px,`+(n.dy*a).toFixed(1)+`px,0) rotate(`+(n.rot*a).toFixed(2)+`deg) scale(`+(n.scale+(1-n.scale)*i).toFixed(3)+`)`,n.el.style.opacity=Math.min(1,i*1.8).toFixed(3)}if(j){let t=(1-e)*38;j.style.transform=`translate3d(0,`+t.toFixed(1)+`px,0)`}O&&(O.style.opacity=e>.02?`0`:`1`);let t=(e-.92)/.07;if(t=t<0?0:t>1?1:t,A&&t!==F){F=t;let e=R(t);A.style.opacity=e.toFixed(3),A.style.transform=`translateY(`+(-40*(1-e)).toFixed(1)+`px)`,A.style.pointerEvents=t>.5?`auto`:`none`}if(k&&t!==P){P=t;let e=R(t);k.style.opacity=e.toFixed(3),k.style.transform=`translateY(`+(40*(1-e)).toFixed(1)+`px)`,k.style.pointerEvents=t>.5?`auto`:`none`}}let B=window.scrollY||0,V=!0;function H(){i=Math.min(window.devicePixelRatio||1,2),n=window.innerWidth,r=window.innerHeight,e.width=Math.round(n*i),e.height=Math.round(r*i),t.setTransform(i,0,0,i,0,0),c(),T(),b(performance.now()),D&&(N=Math.max(1,D.offsetHeight-r));let a=document.querySelector(`.topbar`);a&&document.documentElement.style.setProperty(`--topbar-h`,a.offsetHeight+`px`),V=!0}let U=[];function re(){let e=document.querySelector(`.stage`);for(let t=0;t<4;t++){let t=document.createElement(`span`);t.className=`title-sat`,e.appendChild(t),U.push({el:t,a:Math.random()*Math.PI*2,speed:6e-4+Math.random()*7e-4,rx:140+Math.random()*120,ry:45+Math.random()*40})}}function ie(e){if(!j)return;let t=j.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;for(let t=0;t<U.length;t++){let i=U[t],a=i.a+e*i.speed,o=n+Math.cos(a)*i.rx,s=r+Math.sin(a)*i.ry;i.el.style.transform=`translate3d(`+o.toFixed(1)+`px,`+s.toFixed(1)+`px,0)`}}window.addEventListener(`scroll`,function(){B=window.scrollY,V=!0},{passive:!0}),window.addEventListener(`resize`,H,{passive:!0}),H();let W=document.getElementById(`ufo`),G=window.matchMedia(`(pointer: fine)`).matches,K=-100,q=-100,J=-100,Y=-100,X=0;G&&W&&(document.documentElement.classList.add(`ufo-on`),document.addEventListener(`mousemove`,function(e){J=e.clientX,Y=e.clientY,W.classList.contains(`live`)||(K=J,q=Y,W.classList.add(`live`))},{passive:!0}),document.querySelectorAll(`a`).forEach(function(e){e.addEventListener(`mouseenter`,function(){W.classList.add(`zap`)}),e.addEventListener(`mouseleave`,function(){W.classList.remove(`zap`)})}));function ae(){let e=J-K;K+=e*.18,q+=(Y-q)*.18;let t=Math.max(-22,Math.min(22,e*.6));X+=(t-X)*.15,W.style.transform=`translate3d(`+(K-24).toFixed(1)+`px,`+(q-18).toFixed(1)+`px,0) rotate(`+X.toFixed(2)+`deg)`;let n=document.querySelector(`.pills`);if(n){let e=n.querySelectorAll(`.pill`),t=!1;for(let n=0;n<e.length;n++){let r=e[n].getBoundingClientRect(),i=r.top-80,a=r.bottom+80,o=r.left,s=r.right;if(K+24>=o&&K+24<=s&&q+18>=i&&q+18<=a){t=!0;break}}t?W.classList.add(`zap`):W.classList.remove(`zap`)}}let Z=window.matchMedia(`(prefers-reduced-motion: reduce)`),Q=Z.matches;function $(){document.documentElement.classList.toggle(`static-home`,Q),Q?z(1):V=!0}function oe(){let e=Z.matches;e!==Q&&(Q=e,$())}Z.addEventListener(`change`,oe),L(),re(),$(),Q||z(0);let se=G&&W;(function e(t){if(E(B,t),V&&!Q){V=!1;let e=B/N;z(e<0?0:e>1?1:e)}ie(t),se&&ae(),requestAnimationFrame(e)})(0)})();var e=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,t=`
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
}
/* The scene is the hover region; it only takes pointer events while visible. */
.egg-in .egg-scene { pointer-events: auto; }

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
.egg-antenna { transform-origin: 33px 19px; transition: transform 0.4s ease; }
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
.egg-btn-cap {
  fill: var(--color-red);
  filter: drop-shadow(0 0 6px rgba(224, 58, 47, 0.7));
  transition: filter 0.3s ease, fill 0.3s ease;
}
.egg-label {
  margin-top: 2px;
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-red);
  white-space: nowrap;
}

/* The real button sits invisibly over the drawn cap. */
.egg-button {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
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
  max-width: min(210px, calc(100vw - 32px));
  padding: 8px 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  background: rgba(5, 7, 15, 0.85);
  color: var(--color-ink);
  font-size: 0.72rem;
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
  /* bottom is 44px rather than 24 so the DO NOT PUSH label clears the
     footer link at full scroll */
  .egg-layer { right: 24px; bottom: 44px; }
  .egg-alien { height: 64px; }
  .egg-console { width: 62px; }
  .egg-label { font-size: 0.48rem; }
  .egg-bubble { font-size: 0.66rem; max-width: min(180px, calc(100vw - 24px)); }
}

@media (prefers-reduced-motion: reduce) {
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
<svg class="egg-alien" viewBox="0 0 100 130" aria-hidden="true">
  <defs>
    <clipPath id="eggDomeClip">
      <path d="M 30 46 L 30 30 Q 30 10 50 10 Q 70 10 70 30 L 70 46 Z" />
    </clipPath>
  </defs>

  <!-- reaching arm (viewer's left, toward the console) -->
  <g class="egg-arms-normal">
    <path class="line thin" d="M 36 68 C 24 74, 14 82, 8 92" />
    <path class="line thin" d="M 8 92 L 3.5 95.5 M 8 92 L 7.5 98 M 8 92 L 12 97" />
    <path class="line thin" d="M 64 68 C 70 80, 68 94, 62 102" />
  </g>
  <!-- folded arms, hidden until press 2 -->
  <g class="egg-arms-folded">
    <path class="line thin" d="M 34 72 C 42 82, 54 82, 63 74" />
    <path class="line thin" d="M 66 72 C 58 84, 46 84, 37 76" />
  </g>

  <!-- backpack with exhaust nozzles -->
  <g class="egg-pack">
    <path class="line" d="M 68 72 L 77 74 L 76 92 L 68 90" />
    <path class="line thin" d="M 70.5 92 L 70.5 97 M 74.5 92.4 L 74.5 97" />
    <circle class="egg-particle p1" cx="70.5" cy="100" r="1" />
    <circle class="egg-particle p2" cx="74.5" cy="101" r="0.9" />
    <circle class="egg-particle p3" cx="72.5" cy="99" r="0.8" />
  </g>

  <!-- torso: sloped shoulders, ribbed chest, tapering to a point -->
  <path class="line" d="M 40 62 L 32 70 L 35 96 L 50 118 L 65 96 L 68 70 L 60 62" />
  <path class="line thin" d="M 44 74 L 44.5 90 M 50 75 L 50 92 M 56 74 L 55.5 90" />

  <!-- head: wide top, hard corners, narrow jaw -->
  <path class="line" d="M 35 26 L 65 26 L 61 52 L 55 60 L 45 60 L 39 52 Z" />

  <!-- eyes: narrow, angled down toward centre -->
  <g class="egg-eyes">
    <polygon points="38.5,37 46,40.5 46,43.5 38.5,39.5" />
    <polygon points="61.5,37 54,40.5 54,43.5 61.5,39.5" />
  </g>

  <!-- helmet dome and inner highlight -->
  <path class="line" d="M 30 46 L 30 30 Q 30 10 50 10 Q 70 10 70 30 L 70 46" />
  <path class="line thin egg-glint" d="M 36 24 Q 37 15 45 12.5" />
  <g clip-path="url(#eggDomeClip)">
    <path class="line thin egg-sweep" d="M 34 40 Q 34 16 52 11" />
  </g>

  <!-- antenna, bent once, beacon tip -->
  <g class="egg-antenna">
    <path class="line thin" d="M 33 19 L 27 10 L 31 4" />
    <circle class="egg-antenna-tip" cx="31" cy="3" r="2.2" />
  </g>
</svg>`,r=`
<svg class="egg-console" viewBox="0 0 86 96" aria-hidden="true">
  <!-- top face in perspective, then front face -->
  <path class="line" d="M 20 24 Q 22 21 26 21 L 60 21 Q 64 21 66 24 L 76 36 Q 77 38 74 38 L 12 38 Q 9 38 10 36 Z" />
  <path class="line" d="M 10 38 L 10 48 Q 10 51 13 51 L 73 51 Q 76 51 76 48 L 76 38" />
  <!-- red button cap -->
  <ellipse class="egg-btn-cap" cx="43" cy="24" rx="11" ry="8" />
  <ellipse class="line thin" cx="43" cy="27" rx="11" ry="8" fill="none" />
  <!-- cable running down and off the layer -->
  <path class="cable" fill="none" d="M 40 51 C 36 66, 50 76, 45 96" />
</svg>`;function i(){let t=document.createElement(`div`);return t.className=`egg-layer`+(e?``:` egg-idle`),t.innerHTML=`
    <div class="egg-scene">
      <div class="egg-bubble" role="status" aria-live="polite"></div>
      <div class="egg-console-wrap">
        ${r}
        <button class="egg-button" type="button" aria-label="Do not push"></button>
        <div class="egg-label">Do not push</div>
      </div>
      <div class="egg-alien-float"><div class="egg-alien-tilt"><div class="egg-alien-turn">${n}</div></div></div>
    </div>`,t}function a(){let n=document.createElement(`style`);n.textContent=t,document.head.appendChild(n);let r=i();document.body.appendChild(r);let a=r.querySelector(`.egg-scene`),o=r.querySelector(`.egg-bubble`),s=r.querySelector(`.egg-button`);s.tabIndex=-1;let c=!1;function l(){let e=document.documentElement.scrollHeight-window.innerHeight-window.scrollY<=200;e!==c&&(c=e,r.classList.toggle(`egg-in`,c),s.tabIndex=c?0:-1,c||p(!0))}window.addEventListener(`scroll`,l,{passive:!0}),window.addEventListener(`resize`,l,{passive:!0}),l();let u=null,d=null;function f(e){clearInterval(u),clearTimeout(d),o.textContent=``,o.classList.add(`show`);let t=0;u=setInterval(()=>{o.textContent=e.slice(0,++t),t>=e.length&&clearInterval(u)},40)}function p(e){clearInterval(u),clearTimeout(d),o.classList.remove(`show`),e&&(o.textContent=``)}a.addEventListener(`mouseenter`,()=>{c&&m===0&&f(`Don't.`)}),a.addEventListener(`mouseleave`,()=>{m===0&&(d=setTimeout(()=>p(!1),600))}),s.addEventListener(`focus`,()=>{c&&m===0&&f(`Don't.`)});let m=0,h=null,g=null;function _(){clearTimeout(d),d=setTimeout(()=>p(!1),2500)}s.addEventListener(`click`,()=>{!c||m>=4||(m+=1,m===1?(f(`Don't.`),_(),r.classList.add(`egg-recoil`,`egg-eyes-bright`),clearTimeout(h),clearTimeout(g),h=setTimeout(()=>r.classList.remove(`egg-recoil`),500),g=setTimeout(()=>r.classList.remove(`egg-eyes-bright`),900)):m===2?(f(`I said don't.`),_(),r.classList.remove(`egg-recoil`,`egg-eyes-bright`),r.classList.add(`egg-press2plus`)):m===3?(f(`Do you know how long that took to build.`),_(),r.classList.add(`egg-press3`)):(r.classList.remove(`egg-press3`),r.classList.add(`egg-press4`),f(`Fine.`),clearTimeout(d),setTimeout(x,400)))});function v(e){let t=document.createElement(`div`);return t.className=`egg-fx `+e,document.body.appendChild(t),t}function y(){let e=`http://www.w3.org/2000/svg`,t=document.createElementNS(e,`svg`);t.setAttribute(`class`,`egg-fx egg-cracks`);let n=window.innerWidth/2,r=window.innerHeight/2;for(let i=0;i<9;i++){let a=i/9*Math.PI*2+Math.random()*.5,o=n,s=r,c=`M ${o.toFixed(0)} ${s.toFixed(0)}`,l=5+Math.floor(Math.random()*3);for(let e=0;e<l;e++){a+=(Math.random()-.5)*.9;let t=40+Math.random()*120;if(o+=Math.cos(a)*t,s+=Math.sin(a)*t,c+=` L ${o.toFixed(0)} ${s.toFixed(0)}`,e===2&&Math.random()<.7){let e=a+(Math.random()<.5?1:-1)*(.6+Math.random()*.5),t=o+Math.cos(e)*(30+Math.random()*60),n=s+Math.sin(e)*(30+Math.random()*60);c+=` M ${o.toFixed(0)} ${s.toFixed(0)} L ${t.toFixed(0)} ${n.toFixed(0)} M ${o.toFixed(0)} ${s.toFixed(0)}`}}let u=document.createElementNS(e,`path`);u.setAttribute(`d`,c),u.setAttribute(`class`,`egg-crack`),u.setAttribute(`pathLength`,`1`),u.style.strokeDasharray=`1`,u.style.strokeDashoffset=`1`,u.style.transition=`stroke-dashoffset 0.7s ease-out ${(i*.08).toFixed(2)}s`,t.appendChild(u)}return document.body.appendChild(t),requestAnimationFrame(()=>requestAnimationFrame(()=>{t.querySelectorAll(`path`).forEach(e=>e.style.strokeDashoffset=`0`)})),t}function b(e,t,n,r){let i=e.getBoundingClientRect(),a=window.innerWidth/2-(i.left+i.width/2),o=window.innerHeight/2-(i.top+i.height/2);e.style.transition=`transform ${n}s cubic-bezier(0.55, -0.15, 0.75, 0.5) ${r}s, opacity 0.25s ease ${(r+n*.8).toFixed(2)}s`,e.style.transform=`translate(${a.toFixed(0)}px, ${o.toFixed(0)}px) ${t} scale(0.04)`,e.style.opacity=`0`}function x(){if(p(!0),document.body.style.overflow=`hidden`,e){let e=v(`egg-blackout`);e.style.transition=`opacity 0.8s ease`,requestAnimationFrame(()=>e.style.opacity=`1`),setTimeout(()=>S(e),900);return}let t=document.documentElement,n=[document.getElementById(`starfield`),document.querySelector(`.dotgrid`),document.querySelector(`.topbar`),document.querySelector(`main`),document.querySelector(`footer`),a].filter(Boolean);n.forEach(e=>e.classList.add(`egg-shaken`));let i=9,o=0,s=0,c=1,l=!1,u=setInterval(()=>{l&&(i=Math.min(15,i+.4),s=Math.min(4,s+.27),c=Math.min(1.08,c+.0054)),t.style.setProperty(`--egg-sx`,((Math.random()*2-1)*(i+o)).toFixed(1)+`px`),t.style.setProperty(`--egg-sy`,((Math.random()*2-1)*i).toFixed(1)+`px`),t.style.setProperty(`--egg-rot`,s.toFixed(2)+`deg`),t.style.setProperty(`--egg-scl`,c.toFixed(4))},80),d=(e,t)=>setTimeout(t,e),m=v(`egg-border-flicker`);m.classList.add(`run`),d(600,()=>m.remove());let h=document.getElementById(`stageName`);d(400,()=>h&&h.classList.add(`egg-rgb`));for(let e=0;e<5;e++)d(400+Math.random()*900,()=>{let e=document.createElement(`div`);e.className=`egg-band`,e.style.top=Math.random()*90+`vh`,e.style.height=18+Math.random()*26+`px`;let t=(20+Math.random()*40)*(Math.random()<.5?-1:1);e.style.transform=`translateX(${t}px)`,document.body.appendChild(e),o=30,setTimeout(()=>{o=0,e.remove()},100)});d(1400,()=>h&&h.classList.remove(`egg-rgb`));let g=null,_=null;d(800,()=>{g=y(),_=v(`egg-scanlines`),requestAnimationFrame(()=>_.classList.add(`show`))}),d(1200,()=>{document.querySelectorAll(`#stageName .ltr`).forEach(e=>{b(e,`rotate(${((20+Math.random()*100)*(Math.random()<.5?-1:1)).toFixed(0)}deg)`,.9,Math.random()*.4)}),document.querySelectorAll(`.topbar .pill, #contact .pill`).forEach(e=>{let t=e.getBoundingClientRect();b(e,`rotate(${(Math.atan2(window.innerHeight/2-(t.top+t.height/2),window.innerWidth/2-(t.left+t.width/2))*180/Math.PI).toFixed(0)}deg) scaleX(1.7)`,1,.15+Math.random()*.35)})});let x=v(`egg-flash`);d(2600,()=>{x.style.transition=`opacity 0.12s ease-in`,x.style.opacity=`1`,setTimeout(()=>{x.style.transition=`opacity 0.25s ease-out`,x.style.opacity=`0`},130),document.getElementById(`starfield`).classList.add(`egg-burnout`),document.querySelector(`.dotgrid`)?.classList.add(`egg-burnout`),l=!0}),d(3550,()=>f(`Told you.`)),d(3600,()=>{let e=r.querySelector(`.egg-alien-float`),t=r.querySelector(`.egg-console-wrap`);b(e,`rotate(720deg)`,.55,0),b(t,`rotate(200deg)`,.5,.12)});let C=v(`egg-blackout`);d(4200,()=>{p(!0),x.style.transition=`opacity 0.1s ease-in`,x.style.opacity=`1`,setTimeout(()=>{C.style.transition=`opacity 0.4s ease`,C.style.opacity=`1`,x.style.transition=`opacity 0.4s ease`,x.style.opacity=`0`},250)}),d(4700,()=>{clearInterval(u),n.forEach(e=>e.classList.remove(`egg-shaken`)),[`--egg-sx`,`--egg-sy`,`--egg-rot`,`--egg-scl`].forEach(e=>t.style.removeProperty(e)),g?.remove(),_?.remove(),m.remove(),x.remove()}),d(5e3,()=>S(C))}function S(){let e=document.createElement(`div`);e.className=`egg-dead`,e.innerHTML=`
      <div class="egg-dead-line"></div>
      <div class="egg-dead-line"></div>
      <button class="egg-restart" type="button">RESTART UNIVERSE</button>`,document.body.appendChild(e);let[t,n]=e.querySelectorAll(`.egg-dead-line`),r=e.querySelector(`.egg-restart`);function i(e,t,n){let r=0,i=setInterval(()=>{e.textContent=t.slice(0,++r),r>=t.length&&(clearInterval(i),n())},45)}i(t,`SIGNAL LOST`,()=>{setTimeout(()=>{i(n,`UNIVERSE UNAVAILABLE`,()=>{setTimeout(()=>{r.classList.add(`show`),r.focus()},1e3)})},600)});let a=!1;function o(){a||(a=!0,e.style.transition=`opacity 0.3s ease`,e.style.opacity=`0`,history.scrollRestoration=`manual`,window.scrollTo(0,0),setTimeout(()=>window.location.reload(),300))}r.addEventListener(`click`,o),window.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `||e.key===`Escape`)&&(e.preventDefault(),o())})}}a();