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
       "saturn"  → Saturn seen from a moon + lander
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
    var ribbons = [
      { color: "74,222,128", amp: h * 0.06, base: h * 0.14, sp1: 0.05, sp2: -0.033, sp3: 0.021, alpha: 0.32, thick: h * 0.18, ph: 0 },
      { color: "45,212,191", amp: h * 0.045, base: h * 0.23, sp1: 0.037, sp2: 0.024, sp3: -0.017, alpha: 0.24, thick: h * 0.13, ph: 2.1 },
      { color: "167,139,250", amp: h * 0.07, base: h * 0.07, sp1: 0.029, sp2: -0.019, sp3: 0.013, alpha: 0.22, thick: h * 0.15, ph: 4.6 },
    ];
    forest.auroraRibbons = isMobile() ? ribbons.slice(0, 2) : ribbons;
  };

  /* Three stacked sine octaves — the ribbon's vertical offset at x */
  function auroraWave(rb, x, ts) {
    return Math.sin(x * 0.0035 + ts * rb.sp1 + rb.ph) * rb.amp
      + Math.sin(x * 0.0021 + ts * rb.sp2 + rb.ph * 1.3) * rb.amp * 0.6
      + Math.sin(x * 0.0012 + ts * rb.sp3 + rb.ph * 0.7) * rb.amp * 0.35;
  }

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
    var ts = t * 0.001;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(10px)";
    for (var ri = 0; ri < forest.auroraRibbons.length; ri++) {
      var rb = forest.auroraRibbons[ri];
      var flicker = 0.85 + Math.sin(ts * 0.11 + rb.ph) * 0.15;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 16) {
        var y = rb.base + auroraWave(rb, x, ts);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (var x2 = w; x2 >= 0; x2 -= 16) {
        ctx.lineTo(x2, rb.base + rb.thick + auroraWave(rb, x2, ts));
      }
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, rb.base, 0, rb.base + rb.thick);
      grad.addColorStop(0, "rgba(" + rb.color + "," + (rb.alpha * flicker).toFixed(3) + ")");
      grad.addColorStop(0.5, "rgba(" + rb.color + "," + (rb.alpha * 1.2 * flicker).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(" + rb.color + ",0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.filter = "none";
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
     SATURN SCENE — landed on a moon, Saturn hanging in the sky

     Everything here is deliberately dark and low-contrast: the body copy
     sits directly on this canvas, so the scene must never produce a bright
     zone behind text. Saturn and the lander are also kept off-centre so the
     column the text runs down stays empty sky.
     ============================================================ */
  var saturn = {};

  saturn.stars = [];
  saturn.boulders = [];
  saturn.craters = [];
  saturn.horizon = 0;
  saturn.planet = { cx: 0, cy: 0, r: 0 };
  saturn.eggs = null;

  /* Ring bands — mid-radius and thickness as multiples of the planet radius */
  var RING_BANDS = [
    { r: 1.26, t: 0.12, a: 0.20, c: "184,170,142" },
    { r: 1.54, t: 0.30, a: 0.40, c: "204,188,156" },
    { r: 1.84, t: 0.13, a: 0.24, c: "168,154,128" },
  ];
  var RING_TILT = -0.32;   /* radians the ring plane is rotated on screen */
  var RING_SQUASH = 0.3;   /* how edge-on the ring plane reads */

  /* ---- Easter eggs: occasional, not looping ----
     Each beat waits out a randomised gap, plays once, then re-schedules. */
  function makeEgg(first, minGap, maxGap, dur) {
    return { at: first, min: minGap, max: maxGap, dur: dur, on: false, start: 0, seed: Math.random() };
  }

  /* 0..1 while the beat is playing, -1 while it waits */
  function eggProgress(e, t) {
    if (!e.on) {
      if (t < e.at) return -1;
      e.on = true; e.start = t; e.seed = Math.random();
    }
    var p = (t - e.start) / e.dur;
    if (p >= 1) {
      e.on = false;
      e.at = t + e.min + Math.random() * (e.max - e.min);
      return -1;
    }
    return p;
  }

  /* Fade a beat in and out at its own edges so nothing pops */
  function eggFade(p, edge) {
    return Math.max(0, Math.min(1, Math.min(p, 1 - p) / edge));
  }

  /* The moon's surface line — the lander, the flag and the alien all sit on it */
  function surfaceY(x) {
    return saturn.horizon
      + Math.sin(x * 0.0062 + 1.7) * h * 0.011
      + Math.sin(x * 0.017) * h * 0.005;
  }

  saturn.resize = function () {
    var mobile = isMobile();
    saturn.horizon = h * (mobile ? 0.88 : 0.84);

    saturn.planet = {
      cx: w * (mobile ? 0.78 : 0.82),
      cy: h * (mobile ? 0.19 : 0.29),
      r: Math.min(w, h) * (mobile ? 0.17 : 0.2),
    };

    var starCount = mobile ? 55 : 120;
    saturn.stars = [];
    for (var i = 0; i < starCount; i++) {
      saturn.stars.push({
        x: Math.random() * w,
        y: Math.random() * saturn.horizon,
        r: 0.4 + Math.random() * 0.9,
        a: 0.16 + Math.random() * 0.34,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      });
    }

    saturn.boulders = makeRow(mobile ? 3 : 6, h * 0.015, h * 0.042, 120);

    saturn.craters = [];
    for (var ci = 0; ci < (mobile ? 5 : 9); ci++) {
      saturn.craters.push({
        x: Math.random(),
        d: 0.15 + Math.random() * 0.8,
        rx: 16 + Math.random() * 44,
      });
    }

    /* Built once — a resize must not reset the schedule */
    if (!saturn.eggs) {
      saturn.eggs = {
        ufo: makeEgg(15000, 42000, 80000, 17000),
        satellite: makeEgg(27000, 38000, 72000, 12000),
        alien: makeEgg(39000, 48000, 95000, 7000),
      };
    }
  };

  saturn.drawStars = function (t) {
    for (var i = 0; i < saturn.stars.length; i++) {
      var s = saturn.stars[i];
      var tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = "#dfe8ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  saturn.drawRingArc = function (from, to) {
    var p = saturn.planet;
    for (var i = 0; i < RING_BANDS.length; i++) {
      var b = RING_BANDS[i];
      ctx.strokeStyle = "rgba(" + b.c + "," + b.a + ")";
      ctx.lineWidth = b.t * p.r;
      ctx.beginPath();
      ctx.ellipse(p.cx, p.cy, b.r * p.r, b.r * p.r * RING_SQUASH, RING_TILT, from, to);
      ctx.stroke();
    }
  };

  saturn.drawPlanet = function () {
    var p = saturn.planet, R = p.r;

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, R, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#5c5040";
    ctx.fillRect(p.cx - R, p.cy - R, R * 2, R * 2);

    /* Cloud banding, aligned to the ring plane */
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(RING_TILT);
    var bands = [
      { y: -0.92, h: 0.32, c: "#6b5d48" },
      { y: -0.46, h: 0.20, c: "#4d4333" },
      { y: -0.18, h: 0.28, c: "#73644d" },
      { y: 0.18, h: 0.15, c: "#483f30" },
      { y: 0.44, h: 0.24, c: "#63563f" },
      { y: 0.76, h: 0.34, c: "#433a2c" },
    ];
    for (var i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i].c;
      ctx.fillRect(-R * 1.5, bands[i].y * R, R * 3, bands[i].h * R);
    }
    ctx.restore();

    /* Shadow the rings throw across the disc */
    ctx.strokeStyle = "rgba(8,11,20,0.45)";
    ctx.lineWidth = R * 0.2;
    ctx.beginPath();
    ctx.ellipse(p.cx, p.cy, R * 1.4, R * 1.4 * RING_SQUASH, RING_TILT, 0, Math.PI);
    ctx.stroke();

    /* Terminator — the sun is off to the upper left */
    var term = ctx.createLinearGradient(p.cx - R, p.cy - R, p.cx + R, p.cy + R * 0.8);
    term.addColorStop(0, "rgba(10,14,26,0)");
    term.addColorStop(0.5, "rgba(9,12,23,0.3)");
    term.addColorStop(1, "rgba(6,9,18,0.8)");
    ctx.fillStyle = term;
    ctx.fillRect(p.cx - R, p.cy - R, R * 2, R * 2);

    ctx.restore();
  };

  /* A satellite tracking the far side of the ring plane. Drawn before the
     rings and the disc, so both pass in front of it. */
  saturn.drawSatellite = function (p) {
    var pl = saturn.planet;
    var ang = Math.PI + p * Math.PI;
    var rr = pl.r * 1.62;
    var ex = Math.cos(ang) * rr;
    var ey = Math.sin(ang) * rr * RING_SQUASH;
    var x = pl.cx + ex * Math.cos(RING_TILT) - ey * Math.sin(RING_TILT);
    var y = pl.cy + ex * Math.sin(RING_TILT) + ey * Math.cos(RING_TILT);
    var s = Math.min(w, h) * 0.009;

    ctx.save();
    ctx.globalAlpha = 0.9 * eggFade(p, 0.12);
    ctx.translate(x, y);
    ctx.rotate(RING_TILT);
    ctx.fillStyle = "rgba(196,210,235,0.95)";
    ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
    ctx.fillStyle = "rgba(120,150,200,0.9)";
    ctx.fillRect(-s * 2.1, -s * 0.28, s * 1.5, s * 0.56);
    ctx.fillRect(s * 0.6, -s * 0.28, s * 1.5, s * 0.56);
    ctx.restore();
  };

  /* A saucer drifting the width of the sky, well above the surface */
  saturn.drawUfo = function (p, seed) {
    var dir = seed > 0.5 ? 1 : -1;
    var span = w + 160;
    var x = dir > 0 ? -80 + p * span : w + 80 - p * span;
    var y = h * 0.11 + Math.sin(p * Math.PI * 3) * h * 0.018;
    var s = Math.min(w, h) * 0.0022;

    ctx.save();
    ctx.globalAlpha = 0.45 * eggFade(p, 0.1);
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    ctx.fillStyle = "rgba(120,145,185,0.95)";
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(160,190,225,0.8)";
    ctx.beginPath(); ctx.ellipse(0, -3.5, 7, 6, 0, Math.PI, Math.PI * 2); ctx.fill();
    var blink = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p * 120));
    ctx.fillStyle = "rgba(224,58,47," + blink.toFixed(2) + ")";
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * 10, 2, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  /* Peeks over the ridge, waves, ducks back down. Drawn before the surface
     so the ground clips it — that is what sells the ducking. */
  saturn.drawAlien = function (p, seed) {
    var x = w * (seed > 0.5 ? 0.11 : 0.89);
    var base = surfaceY(x);
    var s = Math.min(w, h) * 0.024;

    /* rise, hold, duck */
    var r = p < 0.18 ? p / 0.18 : (p > 0.82 ? (1 - p) / 0.18 : 1);
    r = r * r * (3 - 2 * r);

    /* Stops just shy of clearing the ridge, so it still reads as a peek */
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.translate(x, base + s * 1.2 - r * s * 1.9);

    ctx.fillStyle = "rgba(126,176,138,0.95)";
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(10,16,24,0.9)";
    ctx.beginPath(); ctx.ellipse(-s * 0.25, -s * 0.08, s * 0.16, s * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.25, -s * 0.08, s * 0.16, s * 0.22, 0.3, 0, Math.PI * 2); ctx.fill();

    /* Waving arm, only once it is all the way up. Drawn after the head and
       hinged clear of it, so it never ghosts through the translucent fill. */
    if (r > 0.98) {
      var wv = Math.sin(p * 42) * 0.55;
      ctx.strokeStyle = "rgba(126,176,138,0.95)";
      ctx.lineCap = "round";
      ctx.lineWidth = s * 0.17;
      ctx.translate(s * 0.66, s * 0.14);
      ctx.rotate(0.9 + wv);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.85); ctx.stroke();
    }

    ctx.restore();
  };

  saturn.drawSurface = function (scrollY) {
    /* Boulders sit on the ridge and drift a little as you scroll */
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawRow(saturn.boulders, saturn.horizon + h * 0.008, drawRock, "#161d31", 0.05, scrollY);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, surfaceY(0));
    for (var x = 0; x <= w; x += 16) ctx.lineTo(x, surfaceY(x));
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "#0c1220";
    ctx.fill();

    /* Rim light off the ridge, lit by the planet */
    ctx.strokeStyle = "rgba(150,172,215,0.16)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, surfaceY(0));
    for (var x2 = 0; x2 <= w; x2 += 16) ctx.lineTo(x2, surfaceY(x2));
    ctx.stroke();

    /* Craters */
    var band = h - saturn.horizon;
    for (var i = 0; i < saturn.craters.length; i++) {
      var c = saturn.craters[i];
      var cx = ((c.x * w - scrollY * 0.04) % (w + 200) + w + 200) % (w + 200) - 100;
      var cy = saturn.horizon + c.d * band;
      ctx.fillStyle = "rgba(4,7,14,0.5)";
      ctx.beginPath(); ctx.ellipse(cx, cy, c.rx, c.rx * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(150,172,215,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy - 1, c.rx, c.rx * 0.3, 0, Math.PI, Math.PI * 2); ctx.stroke();
    }
  };

  /* Planted beside the lander once it is down */
  saturn.drawFlag = function (x, baseY, tSec, appear) {
    if (appear <= 0) return;
    var s = Math.min(w, h) * 0.04 * appear;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(x, baseY);
    ctx.strokeStyle = "rgba(190,200,220,0.9)";
    ctx.lineWidth = Math.max(1, s * 0.055);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s); ctx.stroke();
    var flutter = Math.sin(tSec * 2.2) * s * 0.06;
    ctx.fillStyle = "#e03a2f";
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.3, -s + flutter, s * 0.52, -s * 0.86 + flutter);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.72 - flutter, 0, -s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  saturn.drawLander = function (x, y, tSec, descend) {
    var scale = Math.min(w, h) * 0.00052;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    /* Retro burn — cut once the legs are down */
    var burn = Math.max(0, 1 - descend / 0.97);
    if (burn > 0.01) {
      var flameLen = (40 + Math.sin(tSec * 20) * 10) * burn;
      var flameGrad = ctx.createLinearGradient(0, 60, 0, 60 + flameLen);
      flameGrad.addColorStop(0, "rgba(255,226,170,0.8)");
      flameGrad.addColorStop(0.5, "rgba(255,140,60,0.6)");
      flameGrad.addColorStop(1, "rgba(255,90,40,0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-14, 58); ctx.lineTo(14, 58); ctx.lineTo(0, 58 + flameLen); ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#9aa3b4";
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.quadraticCurveTo(24, -10, 20, 50);
    ctx.lineTo(-20, 50);
    ctx.quadraticCurveTo(-24, -10, 0, -70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a8342b";
    ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(-40, 55); ctx.lineTo(-16, 45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(40, 55); ctx.lineTo(16, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(96,140,185,0.6)";
    ctx.beginPath(); ctx.ellipse(0, -18, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7d8596";
    ctx.beginPath(); ctx.moveTo(-20, 50); ctx.lineTo(20, 50); ctx.lineTo(14, 62); ctx.lineTo(-14, 62); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  saturn.frame = function (t, dt, scrollY) {
    var docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var descend = Math.min(1, scrollY / docMax);
    var tSec = t * 0.001;
    var mobile = isMobile();

    /* Sky — darkest overhead, never brighter than #141b30 at the horizon */
    var sky = ctx.createLinearGradient(0, 0, 0, saturn.horizon);
    sky.addColorStop(0, "#05070f");
    sky.addColorStop(0.5, "#0a1020");
    sky.addColorStop(1, "#141b30");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, saturn.horizon + 1);

    saturn.drawStars(t);

    /* Saturn: satellite, far rings, disc, near rings */
    var pSat = eggProgress(saturn.eggs.satellite, t);
    if (pSat >= 0) saturn.drawSatellite(pSat);

    ctx.save();
    ctx.globalAlpha = 0.74;
    saturn.drawRingArc(Math.PI, Math.PI * 2);
    saturn.drawPlanet();
    saturn.drawRingArc(0, Math.PI);
    ctx.restore();

    var pUfo = eggProgress(saturn.eggs.ufo, t);
    if (pUfo >= 0) saturn.drawUfo(pUfo, saturn.eggs.ufo.seed);

    /* Alien goes under the surface so the ridge clips it */
    var pAlien = eggProgress(saturn.eggs.alien, t);
    if (pAlien >= 0) saturn.drawAlien(pAlien, saturn.eggs.alien.seed);

    saturn.drawSurface(scrollY);

    /* Lander comes down on the opposite side of the frame to Saturn */
    var landX = w * (mobile ? 0.2 : 0.19);
    var padY = surfaceY(landX);
    var scale = Math.min(w, h) * 0.00052;
    var restY = padY - 62 * scale;
    var landY = h * 0.05 + descend * (restY - h * 0.05)
      + Math.sin(tSec * 1.4) * 3 * (1 - descend * 0.6);

    saturn.drawLander(landX, landY, tSec, descend);
    saturn.drawFlag(
      landX + Math.min(w, h) * 0.045,
      padY,
      tSec,
      Math.max(0, Math.min(1, (descend - 0.93) / 0.06))
    );

    /* Dust kicked up on the way down */
    if (descend > 0.6 && descend < 0.995) {
      var puff = Math.min(1, (descend - 0.6) / 0.25);
      ctx.save();
      ctx.globalAlpha = 0.3 * puff;
      for (var si = 0; si < 10; si++) {
        var life = (tSec * 0.5 + si / 10) % 1;
        var sy = landY + 66 * scale + life * h * 0.05;
        if (sy > padY) continue;
        ctx.fillStyle = "rgba(150,160,185," + ((1 - life) * 0.4).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(landX + (si - 4.5) * 3 * (1 + life * 2), sy, 3 + life * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  /* ============================================================
     Main loop — dispatches to active scene
     ============================================================ */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (SCENE === "saturn") saturn.resize();
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

      if (SCENE === "saturn") saturn.frame(t, dt, scrollY);
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
