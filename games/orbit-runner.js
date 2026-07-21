(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  let W=0,H=0,dpr=1,last=0,score=0,spawnT=0,beamCd=0,gameOver=false;
  let stars=[],debris=[],beams=[];
  let pointer={x:0,y:0,down:false,seen:false};

  const bestKey = 'orbit_runner_best_v1';
  let best = Number(localStorage.getItem(bestKey)||0);
  bestEl.textContent = best;

  const ufo = { x:0,y:0,r:14 };
  const planet = { x:0,y:0,r:52,mass:18000 };

  function resize(){
    dpr=Math.min(devicePixelRatio||1,2);
    W=innerWidth;H=innerHeight;
    canvas.width=W*dpr; canvas.height=H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ufo.x=W*0.5; ufo.y=H*0.78;
    planet.x=W*0.5; planet.y=H*0.5;
    stars=[...Array(Math.max(90,Math.round(W*H/13000)))].map(()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.4,s:Math.random()*0.8+.2}));
  }
  addEventListener('resize',resize,{passive:true});
  resize();

  function spawnDebris(){
    const side=Math.random()<0.5?-30:W+30;
    const y=Math.random()*H*0.7+20;
    const vx=side<0?(50+Math.random()*90):-(50+Math.random()*90);
    const vy=(Math.random()-.5)*40;
    debris.push({x:side,y,vx,vy,r:8+Math.random()*9,alive:true});
  }

  function fireBeam(){
    if (beamCd>0 || gameOver) return;
    beamCd = 120; // ms
    const centerY = H*0.5;
    const shootDown = ufo.y < centerY; // requested rule
    beams.push({
      x:ufo.x,
      y:ufo.y + (shootDown ? ufo.r : -ufo.r),
      vx:0,
      vy:shootDown ? 560 : -560
    });
  }

  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();
    pointer.x=e.clientX-r.left; pointer.y=e.clientY-r.top; pointer.seen=true;
  },{passive:true});
  canvas.addEventListener('pointerdown',()=>{pointer.down=true;fireBeam();},{passive:true});
  canvas.addEventListener('pointerup',()=>pointer.down=false,{passive:true});
  addEventListener('keydown',e=>{ if(e.code==='Space') fireBeam(); if(gameOver && e.code==='KeyR') reset(); });

  function reset(){
    score=0; debris.length=0; beams.length=0; gameOver=false; spawnT=0;
  }

  function step(ts){
    if(!last) last=ts;
    const dt=Math.min(33,ts-last); last=ts;
    if (beamCd>0) beamCd-=dt;

    // stars
    for(const s of stars){ s.y+=s.s*dt*0.05; if(s.y>H) s.y=-2; }

    if(!gameOver){
      score += dt*0.01;
      scoreEl.textContent = Math.floor(score);

      spawnT -= dt;
      if(spawnT<=0){ spawnDebris(); spawnT = 500 + Math.random()*500; }

      if(pointer.seen){
        ufo.x += (pointer.x-ufo.x)*0.18;
        ufo.y += (pointer.y-ufo.y)*0.18;
      }

      // debris physics with simple gravity
      for(const d of debris){
        const dx=planet.x-d.x, dy=planet.y-d.y;
        const dist=Math.hypot(dx,dy)||1;
        const g = planet.mass/(dist*dist);
        d.vx += (dx/dist)*g*dt*0.001;
        d.vy += (dy/dist)*g*dt*0.001;
        d.x += d.vx*dt*0.001; d.y += d.vy*dt*0.001;
      }

      // beams
      for(const b of beams){
        b.x += b.vx*dt*0.001; b.y += b.vy*dt*0.001;
      }
      beams = beams.filter(b => b.y>-30 && b.y<H+30);

      // collisions beam->debris
      for(const b of beams){
        for(const d of debris){
          if(!d.alive) continue;
          const dx=b.x-d.x, dy=b.y-d.y;
          if(dx*dx+dy*dy < (d.r+4)*(d.r+4)){
            d.alive=false;
            score += 12;
          }
        }
      }
      debris = debris.filter(d=>d.alive);

      // collisions debris->ufo
      for(const d of debris){
        const dx=d.x-ufo.x, dy=d.y-ufo.y;
        if(dx*dx+dy*dy < (d.r+ufo.r)*(d.r+ufo.r)){
          gameOver=true;
          if(score>best){ best=Math.floor(score); localStorage.setItem(bestKey,String(best)); bestEl.textContent=best; }
        }
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    // stars
    for(const s of stars){
      ctx.globalAlpha=.5;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    }
    ctx.globalAlpha=1;

    // planet
    const g=ctx.createRadialGradient(planet.x-14,planet.y-14,8,planet.x,planet.y,planet.r*1.2);
    g.addColorStop(0,'#7bc2f2'); g.addColorStop(1,'#1d4f8d');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(planet.x,planet.y,planet.r,0,Math.PI*2); ctx.fill();

    // debris
    for(const d of debris){
      ctx.fillStyle='#bfc9d6';
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
    }

    // beams
    for(const b of beams){
      const grad=ctx.createLinearGradient(b.x,b.y,b.x,b.y-(b.vy>0?-24:24));
      grad.addColorStop(0,'rgba(224,58,47,.95)');
      grad.addColorStop(1,'rgba(224,58,47,0)');
      ctx.strokeStyle=grad; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x,b.y-(b.vy>0?-28:28));
      ctx.stroke();
    }

    // ufo
    ctx.fillStyle='#dfe6f2';
    ctx.beginPath(); ctx.ellipse(ufo.x,ufo.y,18,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(180,220,255,.8)';
    ctx.beginPath(); ctx.ellipse(ufo.x,ufo.y-5,8,6,0,0,Math.PI*2); ctx.fill();

    // center line hint
    ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.setLineDash([5,6]);
    ctx.beginPath(); ctx.moveTo(0,H*0.5); ctx.lineTo(W,H*0.5); ctx.stroke();
    ctx.setLineDash([]);

    if(gameOver){
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#fff'; ctx.textAlign='center';
      ctx.font='700 30px "Archivo Black", sans-serif';
      ctx.fillText('MISSION FAILED',W/2,H/2-20);
      ctx.font='400 14px "Space Mono", monospace';
      ctx.fillText('Press R to restart',W/2,H/2+14);
    }
  }

  requestAnimationFrame(step);
})();
