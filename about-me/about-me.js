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

  /* ---- Nordic forest + aurora scene ---- */
  var canvas = document.getElementById("scene");
  var ctx = canvas.getContext("2d");
  var w = 0, h = 0, dpr = 1, raf, t0 = performance.now();
  var isMobile = function () { return window.innerWidth <= 600; };

  var stars = [];
  var fireflies = [];
  var snowflakes = [];
  var distantTrees = [], midTrees = [], fgTrees = [];

  /* ---- Aurora ribbon definitions ---- */
  var auroraRibbons = [];

  function initAurora() {
    var mobile = isMobile();
    var count = mobile ? 2 : 4;
    auroraRibbons = [];
    for (var i = 0; i < count; i++) {
      auroraRibbons.push({
        yBase: 0.12 + i * 0.08,
        amplitude: 20 + Math.random() * 30,
        waveLen: 0.003 + Math.random() * 0.002,
        speed: 0.0002 + Math.random() * 0.0003,
        phase: Math.random() * Math.PI * 2,
        width: 40 + Math.random() * 50,
        hue: i % 3,
      });
    }
  }

  /* ---- Tree row builder (matches design system pattern) ---- */
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

  /* ---- Stars ---- */
  function initStars() {
    var mobile = isMobile();
    var count = mobile ? 40 : 80;
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.45,
        r: 0.4 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }
  }

  /* ---- Fireflies ---- */
  function initFireflies() {
    var mobile = isMobile();
    var count = mobile ? 10 : 22;
    fireflies = [];
    for (var i = 0; i < count; i++) {
      fireflies.push({
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
  }

  /* ---- Snow ---- */
  function initSnow() {
    var mobile = isMobile();
    var count = mobile ? 6 : 12;
    snowflakes = [];
    for (var i = 0; i < count; i++) {
      snowflakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.2,
        speed: 6 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 8,
        alpha: 0.15 + Math.random() * 0.2,
      });
    }
  }

  /* ---- Resize ---- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    distantTrees = makeRow(9, h * 0.06, h * 0.14, 100);
    midTrees = makeRow(7, h * 0.14, h * 0.26, 130);
    fgTrees = makeRow(6, h * 0.22, h * 0.38, 160);

    initStars();
    initFireflies();
    initSnow();
    initAurora();
  }

  /* ---- Draw pine (two-tier silhouette) ---- */
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

  /* ---- Draw tree row with parallax ---- */
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

  /* ---- Draw aurora ribbons ---- */
  function drawAurora(t) {
    var colors = [
      [74, 222, 128],
      [45, 212, 191],
      [167, 139, 250],
    ];

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (var ri = 0; ri < auroraRibbons.length; ri++) {
      var rb = auroraRibbons[ri];
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
  }

  /* ---- Draw stars ---- */
  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase);
      ctx.globalAlpha = 0.4 * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- Draw fireflies ---- */
  function drawFireflies(t) {
    for (var i = 0; i < fireflies.length; i++) {
      var f = fireflies[i];
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
  }

  /* ---- Draw snow ---- */
  function drawSnow(dt) {
    for (var i = 0; i < snowflakes.length; i++) {
      var s = snowflakes[i];
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
  }

  /* ---- Draw fog bands ---- */
  function drawFog(t) {
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
  }

  /* ---- Ground plane ---- */
  function drawGround(scrollY) {
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
  }

  /* ---- Main render frame ---- */
  function frame(now) {
    if (w <= 0 || h <= 0) { raf = requestAnimationFrame(frame); return; }
    try {
      var t = now - t0;
      var dt = Math.min(0.064, (now - (frame._last || now)) * 0.001);
      frame._last = now;
      var scrollY = window.scrollY || 0;

      ctx.clearRect(0, 0, w, h);

      /* 1 — Night sky gradient */
      var sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0a0e1a");
      sky.addColorStop(0.35, "#0b1a28");
      sky.addColorStop(0.6, "#0d2b3a");
      sky.addColorStop(0.85, "#0a1a12");
      sky.addColorStop(1, "#060e08");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      /* 2 — Stars */
      drawStars(t);

      /* 3 — Aurora */
      drawAurora(t);

      /* 4 — Distant trees */
      drawRow(distantTrees, h * 0.68, drawPine, "#0a1e16", 0.03, scrollY);

      /* 5 — Fog between layers */
      drawFog(t);

      /* 6 — Mid trees */
      drawRow(midTrees, h * 0.78, drawPine, "#071510", 0.07, scrollY);

      /* 7 — Fireflies */
      drawFireflies(t);

      /* 8 — Foreground trees */
      drawRow(fgTrees, h * 0.88, drawPine, "#040e08", 0.12, scrollY);

      /* 9 — Ground */
      drawGround(scrollY);

      /* 10 — Snow */
      drawSnow(dt);

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
