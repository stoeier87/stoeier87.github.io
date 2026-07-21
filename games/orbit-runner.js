import { submitScoreOnGameOver } from './shared/score-submit.js';

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  // Dual world presets:
  // - desktop: fills wide screens
  // - mobile: portrait-native
  const DESKTOP_W = 1600;
  const DESKTOP_H = 900;   // 16:9
  const MOBILE_W  = 720;
  const MOBILE_H  = 1280;  // 9:16

  let BASE_W = MOBILE_W;
  let BASE_H = MOBILE_H;

  let W=0,H=0,dpr=1,last=0,score=0,spawnT=0,beamCd=0,gameOver=false;
  let stars=[],debris=[],beams=[];
  let pointer={x:0,y:0,down:false,seen:false,id:null};
  let restartBtn = null;
  let scoreSubmissionStarted = false;

  let viewScale = 1;
  let viewOffX = 0;
  let viewOffY = 0;

  const bestKey = 'orbit_runner_best_v1';
  let best = Number(localStorage.getItem(bestKey)||0);
  bestEl.textContent = best;

  const ufo = { x:0,y:0,r:14 };
  const planet = { x:0,y:0,r:52,mass:18000 };

  function worldW(){ return BASE_W; }
  function worldH(){ return BASE_H; }

  function isMobileLike(){
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
  }

  function setWorldPreset(){
    if(isMobileLike()){
      BASE_W = MOBILE_W;
      BASE_H = MOBILE_H;
    }else{
      BASE_W = DESKTOP_W;
      BASE_H = DESKTOP_H;
    }
  }

  function updateRestartBtn(){
    if(!restartBtn) return;
    restartBtn.style.display = gameOver ? 'block' : 'none';
  }

  function getViewportSize(){
    const vv = window.visualViewport;
    if (vv) return { w: Math.round(vv.width), h: Math.round(vv.height) };
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function updateView(){
    viewScale = Math.min(W / BASE_W, H / BASE_H);
    viewOffX = (W - BASE_W * viewScale) * 0.5;
    viewOffY = (H - BASE_H * viewScale) * 0.5;
  }

  function screenToWorld(clientX, clientY){
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    let wx = (sx - viewOffX) / viewScale;
    let wy = (sy - viewOffY) / viewScale;
    wx = Math.max(0, Math.min(BASE_W, wx));
    wy = Math.max(0, Math.min(BASE_H, wy));
    return { x: wx, y: wy };
  }

  function setPointerFromEvent(e){
    const p = screenToWorld(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
  }

  function initStars(){
    stars = [...Array(Math.max(90,Math.round(worldW()*worldH()/13000)))].map(()=>({
      x:Math.random()*worldW(),
      y:Math.random()*worldH(),
      r:Math.random()*1.5+.4,
      s:Math.random()*0.8+.2
    }));
  }

  function placeCoreObjects(){
    ufo.x = worldW()*0.5;
    ufo.y = worldH()*0.78;
    planet.x = worldW()*0.5;
    planet.y = worldH()*0.5;
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1,2);

    const vp = getViewportSize();
    W = vp.w;
    H = vp.h;

    setWorldPreset();

    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = Math.round(W*dpr);
    canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    updateView();
    placeCoreObjects();
    initStars();
  }

  addEventListener('resize', resize, { passive:true });
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', resize, { passive:true });
    window.visualViewport.addEventListener('scroll', resize, { passive:true });
  }
  resize();

  function spawnDebris(){
    const WW = worldW(), HH = worldH();
    const side = Math.random()<0.5 ? -30 : WW+30;
    const y = Math.random()*HH*0.7+20;
    const vx = side<0 ? (50+Math.random()*90) : -(50+Math.random()*90);
    const vy = (Math.random()-.5)*40;
    debris.push({x:side,y,vx,vy,r:8+Math.random()*9,alive:true});
  }

  function fireBeam(){
    if (beamCd>0 || gameOver) return;
    beamCd = 120;
    const centerY = worldH()*0.5;
    const shootDown = ufo.y < centerY;
    beams.push({ x:ufo.x, y:ufo.y + (shootDown ? ufo.r : -ufo.r), vx:0, vy:shootDown ? 560 : -560 });
  }

  canvas.addEventListener('pointermove',e=>{
    if(pointer.id !== null && e.pointerId !== pointer.id) return;
    setPointerFromEvent(e);
    if(pointer.down) e.preventDefault();
  },{passive:false});

  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault();
    if(gameOver) return;
    pointer.down = true;
    pointer.id = e.pointerId;
    setPointerFromEvent(e);
    if(canvas.setPointerCapture){ try { canvas.setPointerCapture(e.pointerId); } catch(_) {} }
    fireBeam();
  },{passive:false});

  canvas.addEventListener('pointerup',e=>{
    if(pointer.id !== null && e.pointerId !== pointer.id) return;
    pointer.down=false;
    if(canvas.releasePointerCapture){ try { canvas.releasePointerCapture(e.pointerId); } catch(_) {} }
    pointer.id=null;
  },{passive:true});

  canvas.addEventListener('pointercancel',e=>{
    if(pointer.id !== null && e.pointerId !== pointer.id) return;
    pointer.down=false;
    pointer.id=null;
  },{passive:true});

  addEventListener('keydown',e=>{
    if(e.code==='Space') fireBeam();
    if(gameOver && e.code==='KeyR') reset();
  });

  function reset(){
    score=0; debris.length=0; beams.length=0; gameOver=false; spawnT=0;
    scoreSubmissionStarted=false;
    placeCoreObjects();
    updateRestartBtn();
  }

  function step(ts){
    if(!last) last=ts;
    const dt=Math.min(33,ts-last); last=ts;
    if (beamCd>0) beamCd-=dt;

    const WW = worldW(), HH = worldH();

    for(const s of stars){ s.y+=s.s*dt*0.05; if(s.y>HH) s.y=-2; }

    if(!gameOver){
      score += dt*0.01;
      scoreEl.textContent = Math.floor(score);

      spawnT -= dt;
      if(spawnT<=0){ spawnDebris(); spawnT = 500 + Math.random()*500; }

      if(pointer.seen){
        ufo.x += (pointer.x-ufo.x)*0.22;
        ufo.y += (pointer.y-ufo.y)*0.22;
      }

      ufo.x = Math.max(10, Math.min(WW-10, ufo.x));
      ufo.y = Math.max(10, Math.min(HH-10, ufo.y));

      for(const d of debris){
        const dx=planet.x-d.x, dy=planet.y-d.y;
        const dist=Math.hypot(dx,dy)||1;
        const g = planet.mass/(dist*dist);
        d.vx += (dx/dist)*g*dt*0.001;
        d.vy += (dy/dist)*g*dt*0.001;
        d.x += d.vx*dt*0.001; d.y += d.vy*dt*0.001;
      }

      for(const b of beams){ b.x += b.vx*dt*0.001; b.y += b.vy*dt*0.001; }
      beams = beams.filter(b => b.y>-30 && b.y<HH+30);

      for(const b of beams){
        for(const d of debris){
          if(!d.alive) continue;
          const dx=b.x-d.x, dy=b.y-d.y;
          if(dx*dx+dy*dy < (d.r+4)*(d.r+4)){ d.alive=false; score += 12; }
        }
      }
      debris = debris.filter(d=>d.alive);

      for(const d of debris){
        const dx=d.x-ufo.x, dy=d.y-ufo.y;
        if(dx*dx+dy*dy < (d.r+ufo.r)*(d.r+ufo.r)){
          gameOver=true;
          updateRestartBtn();
          if(score>best){ best=Math.floor(score); localStorage.setItem(bestKey,String(best)); bestEl.textContent=best; }

          if(!scoreSubmissionStarted){
            scoreSubmissionStarted = true;
            setTimeout(() => {
              submitScoreOnGameOver({
                gameKey: 'orbit-runner',
                gameLabel: 'Orbit Runner',
                score: Math.floor(score),
                ask: true,
              });
            }, 60);
          }
        }
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0,0,W,H);

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    const WW = worldW(), HH = worldH();
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0,0,WW,HH);

    for(const s of stars){
      ctx.globalAlpha=.5;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    }
    ctx.globalAlpha=1;

    const g=ctx.createRadialGradient(planet.x-14,planet.y-14,8,planet.x,planet.y,planet.r*1.2);
    g.addColorStop(0,'#7bc2f2'); g.addColorStop(1,'#1d4f8d');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(planet.x,planet.y,planet.r,0,Math.PI*2); ctx.fill();

    for(const d of debris){ ctx.fillStyle='#bfc9d6'; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill(); }

    for(const b of beams){
      const grad=ctx.createLinearGradient(b.x,b.y,b.x,b.y-(b.vy>0?-24:24));
      grad.addColorStop(0,'rgba(224,58,47,.95)');
      grad.addColorStop(1,'rgba(224,58,47,0)');
      ctx.strokeStyle=grad; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x,b.y-(b.vy>0?-28:28)); ctx.stroke();
    }

    ctx.fillStyle='#dfe6f2';
    ctx.beginPath(); ctx.ellipse(ufo.x,ufo.y,18,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(180,220,255,.8)';
    ctx.beginPath(); ctx.ellipse(ufo.x,ufo.y-5,8,6,0,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.setLineDash([5,6]);
    ctx.beginPath(); ctx.moveTo(0,HH*0.5); ctx.lineTo(WW,HH*0.5); ctx.stroke();
    ctx.setLineDash([]);

    if(gameOver){
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,WW,HH);
      ctx.fillStyle='#fff'; ctx.textAlign='center';
      ctx.font='700 30px "Archivo Black", sans-serif';
      ctx.fillText('MISSION FAILED',WW/2,HH/2-20);
      ctx.font='400 14px "Space Mono", monospace';
      ctx.fillText('Tap Restart (or press R)',WW/2,HH/2+14);
    }

    ctx.restore();
  }

  restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.type = 'button';
  restartBtn.textContent = 'Restart';
  restartBtn.addEventListener('click', reset);
  restartBtn.addEventListener('touchstart', (e) => { e.preventDefault(); reset(); }, { passive: false });
  document.body.appendChild(restartBtn);

  requestAnimationFrame(step);
})();
