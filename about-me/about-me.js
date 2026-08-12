(function () {
  "use strict";

  /* ---- Scroll-reveal ---- */
  var blocks = document.querySelectorAll(".block");
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add("visible");
      });
    },
    { threshold: 0.2 },
  );
  blocks.forEach(function (b) { io.observe(b); });

  /* ---- Contact form (fake submit) ---- */
  var form = document.getElementById("inquiryForm");
  var sentMsg = document.getElementById("sentMsg");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.hidden = true;
      sentMsg.hidden = false;
    });
  }

  /* ============================================================
     Scene switch — change data-scene on <body> to swap:
       "forest"  → Nordic forest + aurora (default)
       "sunny"   → Daylight rocky landscape + rocket
     ============================================================ */
  var SCENE = document.body.dataset.scene || "forest";

  var canvas = document.getElementById("scene");
  var ctx = canvas.getContext("2d");
  var w = 0, h = 0, dpr = 1, raf, t0 = performance.now();
  var isMobile = function () { return window.innerWidth <= 600; };

  /* ---- Shared: tree row builder ---- */
  function makeRow(count, minH, maxH, spread) {
    var mobile = isMobile();
    var n = mobile ? Math.round(count * 0.6) : count;
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push({
        x: Math.random(),
        width: spread * (0.6 + Math.random() * 0.6),
        height: minH + Math.random() * (maxH - minH),
      });
    }
    return arr;
  }

  /* ---- Shared: draw pine silhouette ---- */
  function drawPine(x, baseY, width, height, color) {
    ctx.fillStyle = color;
    for (var i = 0; i < 2; i++) {
      var tierH = height * (0.62 - i * 0.08);
      var tierW = width * (1 - i * 0.32);
      var tierBase = baseY - i * height * 0.4;
      var tierTop = tierBase - tierH;
      ctx.beginPath();
      ctx.moveTo(x - tierW / 2, tierBase);
      ctx.lineTo(x, tierTop);
      ctx.lineTo(x + tierW / 2, tierBase);
      ctx.quadraticCurveTo(x, tierBase - tierH * 0.14, x - tierW / 2, tierBase);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---- Shared: draw rock shape ---- */
  function drawRock(x, baseY, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, baseY);
    ctx.lineTo(x - width * 0.32, baseY - height * 0.7);
    ctx.lineTo(x - width * 0.05, baseY - height);
    ctx.lineTo(x + width * 0.3, baseY - height * 0.6);
    ctx.lineTo(x + width / 2, baseY);
    ctx.closePath();
    ctx.fill();
  }

  /* ---- Shared: draw row with parallax ---- */
  function drawRow(items, baseY, drawFn, color, parallax, scrollY) {
    var shift = scrollY * parallax;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var period = w + it.width * 2;
      var x = it.x * period - it.width - (shift % period);
      if (x < -it.width) x += period;
      drawFn(x + it.width / 2, baseY, it.width, it.height, color);
    }
  }

  /* ============================================================
     FOREST SCENE — Nordic night + aurora
     ============================================================ */
  var forest = {};

  forest.stars = [];
  forest.fireflies = [];
  forest.snowflakes = [];
  forest.distantTrees = [];
  forest.midTrees = [];
  forest.fgTrees = [];
  forest.auroraRibbons = [];

  forest.initAurora = function () {
    var mobile = isMobile();
    var count = mobile ? 2 : 4;
    forest.auroraRibbons = [];
    for (var i = 0; i < count; i++) {
      forest.auroraRibbons.push({
        yBase: 0.12 + i * 0.08,
        amplitude: 20 + Math.random() * 30,
        waveLen: 0.003 + Math.random() * 0.002,
        speed: 0.0002 + Math.random() * 0.0003,
        phase: Math.random() * Math.PI * 2,
        width: 40 + Math.random() * 50,
        hue: i % 3,
      });
    }
  };

  forest.initStars = function () {
    var count = isMobile() ? 40 : 80;
    forest.stars = [];
    for (var i = 0; i < count; i++) {
      forest.stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.45,
        r: 0.4 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }
  };

  forest.initFireflies = function () {
    var count = isMobile() ? 10 : 22;
    forest.fireflies = [];
    for (var i = 0; i < count; i++) {
      forest.fireflies.push({
        x: Math.random() * w,
        y: h * (0.45 + Math.random() * 0.4),
        driftX: (Math.random() - 0.5) * 12,
        driftY: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.002 + Math.random() * 0.003,
        r: 1.5 + Math.random() * 1.5,
        warm: Math.random() > 0.5,
      });
    }
  };

  forest.initSnow = function () {
    var count = isMobile() ? 6 : 12;
    forest.snowflakes = [];
    for (var i = 0; i < count; i++) {
      forest.snowflakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.2,
        speed: 6 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 8,
        alpha: 0.15 + Math.random() * 0.2,
      });
    }
  };

  forest.resize = function () {
    forest.distantTrees = makeRow(9, h * 0.06, h * 0.14, 100);
    forest.midTrees = makeRow(7, h * 0.14, h * 0.26, 130);
    forest.fgTrees = makeRow(6, h * 0.22, h * 0.38, 160);
    forest.initStars();
    forest.initFireflies();
    forest.initSnow();
    forest.initAurora();
  };

  forest.drawAurora = function (t) {
    var colors = [
      [74, 222, 128],
      [45, 212, 191],
      [167, 139, 250],
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var ri = 0; ri < forest.auroraRibbons.length; ri++) {
      var rb = forest.auroraRibbons[ri];
      var col = colors[rb.hue];
      var baseY = rb.yBase * h;
      for (var x = 0; x < w; x += 3) {
        var wave = Math.sin(x * rb.waveLen + t * rb.speed + rb.phase);
        var wave2 = Math.sin(x * rb.waveLen * 1.7 + t * rb.speed * 0.6 + rb.phase * 2.3);
        var y = baseY + wave * rb.amplitude + wave2 * rb.amplitude * 0.4;
        var intensityWave = (Math.sin(x * 0.004 + t * 0.0004 + rb.phase) + 1) * 0.5;
        var alpha = 0.04 + intensityWave * 0.08;
        var grad = ctx.createLinearGradient(x, y - rb.width, x, y + rb.width);
        grad.addColorStop(0, "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0)");
        grad.addColorStop(0.3, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (alpha * 0.6).toFixed(4) + ")");
        grad.addColorStop(0.5, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha.toFixed(4) + ")");
        grad.addColorStop(0.7, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (alpha * 0.6).toFixed(4) + ")");
        grad.addColorStop(1, "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y - rb.width, 4, rb.width * 2);
      }
    }
    ctx.restore();
  };

  forest.drawStars = function (t) {
    for (var i = 0; i < forest.stars.length; i++) {
      var s = forest.stars[i];
      var tw = 0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase);
      ctx.globalAlpha = 0.4 * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  forest.drawFireflies = function (t) {
    for (var i = 0; i < forest.fireflies.length; i++) {
      var f = forest.fireflies[i];
      var pulse = 0.3 + 0.7 * ((Math.sin(t * f.pulseSpeed + f.phase) + 1) * 0.5);
      var fx = f.x + Math.sin(t * 0.0005 + f.phase) * f.driftX;
      var fy = f.y + Math.cos(t * 0.0004 + f.phase * 1.3) * f.driftY;
      var color = f.warm ? "251,191,36" : "253,230,138";
      var glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, f.r * 8);
      glow.addColorStop(0, "rgba(" + color + "," + (0.25 * pulse).toFixed(3) + ")");
      glow.addColorStop(1, "rgba(" + color + ",0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, f.r * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(" + color + "," + (0.8 * pulse).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  forest.drawSnow = function (dt) {
    for (var i = 0; i < forest.snowflakes.length; i++) {
      var s = forest.snowflakes[i];
      s.y += s.speed * dt;
      s.x += s.drift * dt;
      if (s.y > h + 4) { s.y = -4; s.x = Math.random() * w; }
      if (s.x > w + 4) s.x = -4;
      if (s.x < -4) s.x = w + 4;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  forest.drawFog = function (t) {
    var bands = [
      { y: 0.62, alpha: 0.035, speed: 0.00008, width: 0.06 },
      { y: 0.72, alpha: 0.045, speed: 0.00012, width: 0.05 },
      { y: 0.82, alpha: 0.03, speed: 0.00006, width: 0.04 },
    ];
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var y = b.y * h;
      var bw = b.width * h;
      var offset = Math.sin(t * b.speed + i * 2.1) * w * 0.08;
      var grad = ctx.createLinearGradient(0, y - bw, 0, y + bw);
      grad.addColorStop(0, "rgba(200,220,230,0)");
      grad.addColorStop(0.5, "rgba(200,220,230," + b.alpha.toFixed(4) + ")");
      grad.addColorStop(1, "rgba(200,220,230,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(offset - w * 0.1, y - bw, w * 1.2, bw * 2);
    }
  };

  forest.drawGround = function (scrollY) {
    var groundY = h * 0.9;
    ctx.fillStyle = "#060e08";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = "#071009";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (var x = 0; x <= w; x += 40) {
      ctx.lineTo(x, groundY + Math.sin(x * 0.008 + scrollY * 0.001) * 5);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  };

  forest.frame = function (t, dt, scrollY) {
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0a0e1a");
    sky.addColorStop(0.35, "#0b1a28");
    sky.addColorStop(0.6, "#0d2b3a");
    sky.addColorStop(0.85, "#0a1a12");
    sky.addColorStop(1, "#060e08");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    forest.drawStars(t);
    forest.drawAurora(t);
    drawRow(forest.distantTrees, h * 0.68, drawPine, "#0a1e16", 0.03, scrollY);
    forest.drawFog(t);
    drawRow(forest.midTrees, h * 0.78, drawPine, "#071510", 0.07, scrollY);
    forest.drawFireflies(t);
    drawRow(forest.fgTrees, h * 0.88, drawPine, "#040e08", 0.12, scrollY);
    forest.drawGround(scrollY);
    forest.drawSnow(dt);
  };

  /* ============================================================
     SUNNY SCENE — Daylight rocky landscape + rocket
     ============================================================ */
  var sunny = {};

  sunny.clouds = [];
  sunny.birds = [];
  sunny.rocks = [];
  sunny.trees = [];
  sunny.smoke = [];

  sunny.resize = function () {
    var mobile = isMobile();
    sunny.clouds = Array.from({ length: mobile ? 3 : 5 }, function () {
      return { x: Math.random() * w, y: h * (0.08 + Math.random() * 0.2), s: 0.6 + Math.random() * 0.8, speed: 4 + Math.random() * 6 };
    });
    sunny.birds = Array.from({ length: mobile ? 0 : 3 }, function () {
      return { x: Math.random() * w, y: h * (0.14 + Math.random() * 0.12), speed: 8 + Math.random() * 6, phase: Math.random() * Math.PI * 2 };
    });
    sunny.rocks = makeRow(mobile ? 3 : 5, h * 0.08, h * 0.16, 160);
    sunny.trees = makeRow(mobile ? 4 : 7, h * 0.22, h * 0.36, 150);
    sunny.smoke = Array.from({ length: 14 }, function (_, i) {
      return { t: i / 14, r: 6 + Math.random() * 10, ox: (Math.random() - 0.5) * 14 };
    });
  };

  sunny.frame = function (t, dt, scrollY) {
    var now = t + t0;
    var docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var scrollProgress = Math.min(1, scrollY / docMax);

    /* Sky */
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5ec2e8");
    sky.addColorStop(0.45, "#a9dff2");
    sky.addColorStop(0.75, "#f4e7b8");
    sky.addColorStop(1, "#e8c887");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* Sun */
    var sunX = w * 0.78, sunY = h * 0.16, sunR = Math.min(w, h) * 0.07;
    var glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4);
    glow.addColorStop(0, "rgba(255,247,214,0.9)");
    glow.addColorStop(1, "rgba(255,247,214,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

    /* Clouds */
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (var ci = 0; ci < sunny.clouds.length; ci++) {
      var c = sunny.clouds[ci];
      c.x -= c.speed * 0.016;
      if (c.x < -80 * c.s) c.x = w + 80 * c.s;
      var cx = c.x, cy = c.y, s = c.s;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24 * s, cy + 4 * s, 24 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 22 * s, cy + 5 * s, 22 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Birds */
    ctx.strokeStyle = "rgba(60,50,40,0.5)";
    ctx.lineWidth = 1.5;
    for (var bi = 0; bi < sunny.birds.length; bi++) {
      var b = sunny.birds[bi];
      b.x -= b.speed * 0.016;
      if (b.x < -20) b.x = w + 20;
      var bob = Math.sin(now * 0.004 + b.phase) * 4;
      var y = b.y + bob;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, y); ctx.quadraticCurveTo(b.x - 3, y - 6, b.x, y);
      ctx.quadraticCurveTo(b.x + 3, y - 6, b.x + 8, y);
      ctx.stroke();
    }

    /* Rocks */
    drawRow(sunny.rocks, h * 0.66, drawRock, "#9c8264", 0.06, scrollY);

    /* Rocket */
    var tSec = t * 0.001;
    var rocketBaseY = h * 0.86;
    var descend = scrollProgress;
    var rocketY = h * 0.06 + descend * (rocketBaseY - h * 0.06) + Math.sin(tSec * 1.4) * 3 * (1 - descend * 0.6);
    var rocketX = w * (5 / 6);
    var scale = Math.min(w, h) * 0.00042;

    ctx.save();
    ctx.translate(rocketX, rocketY);
    ctx.scale(scale, scale);
    var flameLen = 40 + Math.sin(tSec * 20) * 10;
    var flameGrad = ctx.createLinearGradient(0, 60, 0, 60 + flameLen);
    flameGrad.addColorStop(0, "rgba(255,236,180,0.95)");
    flameGrad.addColorStop(0.5, "rgba(255,150,60,0.8)");
    flameGrad.addColorStop(1, "rgba(255,90,40,0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-14, 58); ctx.lineTo(14, 58); ctx.lineTo(0, 58 + flameLen); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e7e9ee";
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.quadraticCurveTo(24, -10, 20, 50);
    ctx.lineTo(-20, 50);
    ctx.quadraticCurveTo(-24, -10, 0, -70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e03a2f";
    ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(-40, 55); ctx.lineTo(-16, 45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(40, 55); ctx.lineTo(16, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(90,140,190,0.75)";
    ctx.beginPath(); ctx.ellipse(0, -18, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c7cad1";
    ctx.beginPath(); ctx.moveTo(-20, 50); ctx.lineTo(20, 50); ctx.lineTo(14, 62); ctx.lineTo(-14, 62); ctx.closePath(); ctx.fill();
    ctx.restore();

    /* Smoke */
    if (descend > 0.55) {
      var smokeAlpha = Math.min(1, (descend - 0.55) / 0.3);
      for (var si = 0; si < sunny.smoke.length; si++) {
        var sm = sunny.smoke[si];
        var life = (tSec * 0.6 + sm.t) % 1;
        var sy = rocketY + 70 * scale + life * 60;
        var sx = rocketX + sm.ox * (1 + life * 2);
        ctx.beginPath();
        ctx.arc(sx, sy, sm.r * (0.5 + life), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(230,225,215," + ((1 - life) * 0.35 * smokeAlpha).toFixed(3) + ")";
        ctx.fill();
      }
    }

    /* Trees */
    drawRow(sunny.trees, h * 0.82, drawPine, "#3a5f3a", 0.1, scrollY);

    /* Ground */
    ctx.fillStyle = "#4f7a4a";
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = "#3f6a3d";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.86);
    for (var x2 = 0; x2 <= w; x2 += 40) ctx.lineTo(x2, h * 0.86 + Math.sin(x2 * 0.01 + scrollY * 0.002) * 6);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();
  };

  /* ============================================================
     Main loop — dispatches to active scene
     ============================================================ */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (SCENE === "sunny") sunny.resize();
    else forest.resize();
  }

  function frame(now) {
    if (w <= 0 || h <= 0) { raf = requestAnimationFrame(frame); return; }
    try {
      var t = now - t0;
      var dt = Math.min(0.064, (now - (frame._last || now)) * 0.001);
      frame._last = now;
      var scrollY = window.scrollY || 0;
      ctx.clearRect(0, 0, w, h);

      if (SCENE === "sunny") sunny.frame(t, dt, scrollY);
      else forest.frame(t, dt, scrollY);
    } catch (err) {
      console.error("about-me scene error", err);
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  var ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });
  raf = requestAnimationFrame(frame);
})();
