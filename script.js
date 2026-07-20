(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) document.documentElement.classList.add('js-anim');

    /* ============ Starfield ============ */
    var canvas = document.getElementById('starfield');
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var layers = [];
    var LAYER_DEFS = [
        { density: 22000, sizeMin: 0.5, sizeMax: 1.0, parallax: 0.12, alpha: 0.5 },
        { density: 14000, sizeMin: 1.0, sizeMax: 1.7, parallax: 0.30, alpha: 0.7 },
        { density: 26000, sizeMin: 1.7, sizeMax: 2.5, parallax: 0.55, alpha: 0.9 }
    ];

    // Deterministisk pseudo-random (stabil på tværs af resize/frames)
    function rand(seed) {
        var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function buildStars() {
        layers = LAYER_DEFS.map(function (def, li) {
            var count = Math.max(20, Math.round((W * H) / def.density));
            var stars = [];
            for (var i = 0; i < count; i++) {
                var s = li * 10000 + i * 7;
                stars.push({
                    x: rand(s + 1) * W,
                    y: rand(s + 2) * H,
                    r: def.sizeMin + rand(s + 3) * (def.sizeMax - def.sizeMin),
                    phase: rand(s + 4) * Math.PI * 2,
                    speed: 0.5 + rand(s + 5) * 1.2
                });
            }
            return { def: def, stars: stars };
        });
    }

    /* ============ Planeter ============ */
    // r = andel af vmin, s0 = hvor paa rejsen planeten passerer midten,
    // px = vandret position (andel af W), pf = parallax-dybde
    var PLANETS = [
        { name: 'MERKUR',  r: 0.020, s0: 0.06, px: 0.80, pf: 0.42, hi: '#b8b0a8', lo: '#5c554e' },
        { name: 'VENUS',   r: 0.034, s0: 0.16, px: 0.16, pf: 0.50, hi: '#e8cfa0', lo: '#a67c48' },
        { name: 'JORDEN',  r: 0.040, s0: 0.27, px: 0.83, pf: 0.58, hi: '#6fb6e8', lo: '#1c4e8a', earth: true },
        { name: 'MARS',    r: 0.028, s0: 0.38, px: 0.14, pf: 0.46, hi: '#e0704a', lo: '#8a3520' },
        { name: 'JUPITER', r: 0.105, s0: 0.52, px: 0.85, pf: 0.62, hi: '#d9b48a', lo: '#8a6238', bands: true },
        { name: 'SATURN',  r: 0.080, s0: 0.67, px: 0.16, pf: 0.55, hi: '#e3c68f', lo: '#9c7a48', ring: true },
        { name: 'URANUS',  r: 0.042, s0: 0.80, px: 0.82, pf: 0.48, hi: '#a8e0e8', lo: '#4a98a8' },
        { name: 'NEPTUN',  r: 0.046, s0: 0.92, px: 0.15, pf: 0.60, hi: '#6a8ce8', lo: '#2a3f9c' }
    ];

    function drawPlanet(p, x, y, r) {
        // Svag glow
        var glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
        glow.addColorStop(0, 'rgba(255,255,255,0.06)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, 6.2832);
        ctx.fill();

        // Saturns ring: bagerste halvdel foerst
        if (p.ring) {
            ctx.strokeStyle = 'rgba(214, 194, 150, 0.55)';
            ctx.lineWidth = r * 0.30;
            ctx.beginPath();
            ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, Math.PI, 6.2832);
            ctx.stroke();
        }

        // Kroppen med lys fra oeverste venstre
        var body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
        body.addColorStop(0, p.hi);
        body.addColorStop(1, p.lo);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();

        if (p.bands || p.earth) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 6.2832);
            ctx.clip();
            if (p.bands) {
                // Jupiters striber
                ctx.fillStyle = 'rgba(110, 74, 44, 0.35)';
                ctx.fillRect(x - r, y - r * 0.52, r * 2, r * 0.18);
                ctx.fillRect(x - r, y - r * 0.10, r * 2, r * 0.22);
                ctx.fillRect(x - r, y + r * 0.38, r * 2, r * 0.15);
                // Den store roede plet
                ctx.fillStyle = 'rgba(200, 90, 60, 0.75)';
                ctx.beginPath();
                ctx.ellipse(x + r * 0.35, y + r * 0.24, r * 0.18, r * 0.11, 0, 0, 6.2832);
                ctx.fill();
            }
            if (p.earth) {
                // Stiliserede kontinenter + polarkappe
                ctx.fillStyle = 'rgba(76, 156, 94, 0.85)';
                ctx.beginPath();
                ctx.ellipse(x - r * 0.30, y - r * 0.15, r * 0.42, r * 0.30, 0.5, 0, 6.2832);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + r * 0.42, y + r * 0.35, r * 0.28, r * 0.20, -0.4, 0, 6.2832);
                ctx.fill();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(x + r * 0.1, y - r * 0.8, r * 0.35, r * 0.18, 0, 0, 6.2832);
                ctx.fill();
            }
            ctx.restore();
        }

        // Ringens forreste halvdel over kroppen
        if (p.ring) {
            ctx.strokeStyle = 'rgba(224, 204, 160, 0.7)';
            ctx.lineWidth = r * 0.30;
            ctx.beginPath();
            ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, 0, Math.PI);
            ctx.stroke();
        }

    }

    function drawPlanets(scroll) {
        var vmin = Math.min(W, H);
        var S = journeyEnd;
        for (var i = 0; i < PLANETS.length; i++) {
            var p = PLANETS[i];
            var r = p.r * vmin;
            var worldY = H * 0.55 + p.s0 * S * p.pf;
            var y = worldY - scroll * p.pf;
            if (y < -r * 3 || y > H + r * 3) continue;
            drawPlanet(p, p.px * W, y, r);
        }
    }

    // Statisk opstilling naar reduced motion er slaaet til
    function drawPlanetsStatic() {
        var vmin = Math.min(W, H);
        drawPlanet(PLANETS[5], W * 0.85, H * 0.20, 0.05 * vmin);  // Saturn
        drawPlanet(PLANETS[3], W * 0.12, H * 0.72, 0.025 * vmin); // Mars
        drawPlanet(PLANETS[2], W * 0.90, H * 0.82, 0.03 * vmin);  // Jorden
    }

    /* ============ Shooting stars + satellites + ISS ============ */
    var shootingStars = [];
    var satellites = [];
    var nextShootAt = 0;
    var nextISSAt = 0;

    function scheduleNextShoot(now) {
        var delay = reduced
            ? 12000 + Math.random() * 10000
            : 1800 + Math.random() * 4700;
        nextShootAt = now + delay;
    }

    function spawnShootingStar() {
        var startX = Math.random() * W * 0.6 - W * 0.2;
        var startY = Math.random() * H * 0.35;
        var speed = 650 + Math.random() * 550;
        var len = 90 + Math.random() * 120;
        var angle = (25 + Math.random() * 20) * (Math.PI / 180);
        shootingStars.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            ttl: 700 + Math.random() * 450,
            len: len,
            width: 1 + Math.random() * 1.2
        });
    }

    function updateShootingStars(dt, now) {
        if (now >= nextShootAt && shootingStars.length < (reduced ? 1 : 3)) {
            spawnShootingStar();
            scheduleNextShoot(now);
        }

        for (var i = shootingStars.length - 1; i >= 0; i--) {
            var s = shootingStars[i];
            s.life += dt;
            s.x += s.vx * (dt / 1000);
            s.y += s.vy * (dt / 1000);
            if (s.life > s.ttl || s.x > W + s.len || s.y > H + s.len) {
                shootingStars.splice(i, 1);
            }
        }
    }

    function drawShootingStars() {
        for (var i = 0; i < shootingStars.length; i++) {
            var s = shootingStars[i];
            var p = 1 - s.life / s.ttl;
            var n = Math.hypot(s.vx, s.vy) || 1;
            var tailX = s.x - (s.vx / n) * s.len;
            var tailY = s.y - (s.vy / n) * s.len;

            var grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, 'rgba(255,255,255,' + (0.95 * p).toFixed(3) + ')');
            grad.addColorStop(0.35, 'rgba(180,220,255,' + (0.45 * p).toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(180,220,255,0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }
    }

    function createSatellite(isISS) {
        var fromLeft = Math.random() > 0.5;
        var yBand = isISS
            ? H * (0.22 + Math.random() * 0.2)
            : H * (0.1 + Math.random() * 0.45);

        var baseSpeed = isISS
            ? 46 + Math.random() * 18
            : 18 + Math.random() * 26;

        return {
            isISS: !!isISS,
            x: fromLeft ? -40 : W + 40,
            y: yBand,
            vx: fromLeft ? baseSpeed : -baseSpeed,
            vy: (Math.random() - 0.5) * (isISS ? 3 : 2.2),
            size: isISS ? 2.2 : 1.3 + Math.random() * 1.1,
            blinkPhase: Math.random() * Math.PI * 2,
            blinkSpeed: isISS ? 0.003 : 0.006 + Math.random() * 0.005,
            glow: isISS ? 0.9 : 0.55 + Math.random() * 0.25
        };
    }

    function initSatellites() {
        satellites.length = 0;
        var count = reduced ? 2 : 5;
        for (var i = 0; i < count; i++) satellites.push(createSatellite(false));
    }

    function scheduleISS(now) {
        var delay = reduced
            ? 150000 + Math.random() * 90000
            : 45000 + Math.random() * 45000;
        nextISSAt = now + delay;
    }

    function updateSatellites(dt, now) {
        var hasISS = satellites.some(function (s) { return s.isISS; });
        if (!hasISS && now >= nextISSAt) {
            satellites.push(createSatellite(true));
            scheduleISS(now);
        }

        for (var i = satellites.length - 1; i >= 0; i--) {
            var s = satellites[i];
            s.x += s.vx * (dt / 1000);
            s.y += s.vy * (dt / 1000);
            s.y += Math.sin((now + s.blinkPhase * 2000) * 0.00035) * (s.isISS ? 0.04 : 0.02);

            var out = s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40;
            if (out) {
                if (s.isISS) satellites.splice(i, 1);
                else satellites[i] = createSatellite(false);
            }
        }
    }

    function drawSatelliteDot(s, now) {
        var blink = 0.55 + 0.45 * Math.sin(now * s.blinkSpeed + s.blinkPhase);
        var alpha = s.glow * blink;

        var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 6);
        g.addColorStop(0, 'rgba(220,240,255,' + (0.45 * alpha).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(220,240,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = s.isISS
            ? 'rgba(255,255,255,' + Math.min(1, alpha + 0.2).toFixed(3) + ')'
            : 'rgba(210,230,255,' + alpha.toFixed(3) + ')';

        if (s.isISS) {
            ctx.fillRect(s.x - 1.2, s.y - 0.8, 2.4, 1.6);
            ctx.fillRect(s.x - 4.4, s.y - 0.45, 2.5, 0.9);
            ctx.fillRect(s.x + 1.9, s.y - 0.45, 2.5, 0.9);
        } else {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSatellites(now) {
        for (var i = 0; i < satellites.length; i++) drawSatelliteDot(satellites[i], now);
    }

    function drawStars(scroll, time) {
        ctx.clearRect(0, 0, W, H);
        for (var li = 0; li < layers.length; li++) {
            var layer = layers[li];
            var def = layer.def;
            var offset = scroll * def.parallax;
            for (var i = 0; i < layer.stars.length; i++) {
                var st = layer.stars[i];
                var y = (st.y - offset) % H;
                if (y < 0) y += H;
                var tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(time * 0.001 * st.speed + st.phase);
                ctx.globalAlpha = def.alpha * tw;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(st.x, y, st.r, 0, 6.2832);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        if (!reduced || Math.random() < 0.35) {
            updateShootingStars(Math.min(64, time - (drawStars._lastTime || time)), time);
            drawShootingStars();
        }

        updateSatellites(Math.min(64, time - (drawStars._lastTime || time)), time);
        drawSatellites(time);

        drawStars._lastTime = time;

        if (reduced) {
            drawPlanetsStatic();
        } else {
            drawPlanets(scroll);
        }
    }

    /* ============ Bogstav-rejsen ============ */
    var journey = document.querySelector('.journey');
    var hint = document.getElementById('hint');
    var contact = document.getElementById('contact');
    var letters = [];
    var journeyEnd = 1;
    var lastContactT = -1;

    // Scroll-vinduer pr. ord (andel af rejsen)
    var WINDOWS = [
        [0.03, 0.30],
        [0.36, 0.62],
        [0.68, 0.90]
    ];

    function splitLetters() {
        var words = document.querySelectorAll('#stageName .word');
        var idx = 0;
        words.forEach(function (word, wi) {
            var chars = Array.from(word.textContent);
            word.textContent = '';
            var n = chars.length;
            chars.forEach(function (ch, ci) {
                var span = document.createElement('span');
                span.className = 'ltr';
                span.textContent = ch;
                word.appendChild(span);
                var w0 = WINDOWS[wi][0], w1 = WINDOWS[wi][1];
                var range = w1 - w0;
                var seed = idx * 13 + 5;
                var angle = rand(seed + 1) * Math.PI * 2;
                var vmax = Math.max(window.innerWidth, window.innerHeight);
                letters.push({
                    el: span,
                    t0: w0 + (ci / n) * range * 0.65,
                    dur: range * 0.35,
                    dx: Math.cos(angle) * (0.55 + rand(seed + 2) * 0.7) * vmax,
                    dy: Math.sin(angle) * (0.55 + rand(seed + 3) * 0.7) * vmax,
                    scale: 0.3 + rand(seed + 4) * 2.4,
                    rot: (rand(seed + 5) - 0.5) * 90,
                    last: -1
                });
                idx++;
            });
            // Ordet var skjult indtil bogstaverne er splittet
            word.style.visibility = 'visible';
        });
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function updateLetters(p) {
        for (var i = 0; i < letters.length; i++) {
            var l = letters[i];
            var t = (p - l.t0) / l.dur;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            if (t === l.last) continue;
            l.last = t;
            var e = easeOutCubic(t);
            var inv = 1 - e;
            l.el.style.transform = 'translate3d(' + (l.dx * inv).toFixed(1) + 'px,' +
                (l.dy * inv).toFixed(1) + 'px,0) rotate(' + (l.rot * inv).toFixed(2) + 'deg) scale(' +
                (l.scale + (1 - l.scale) * e).toFixed(3) + ')';
            l.el.style.opacity = Math.min(1, e * 1.8).toFixed(3);
        }
        if (hint) hint.style.opacity = p > 0.02 ? '0' : '1';

        // Kontakten toner frem naar navnet er fanget (p 0.92-0.99)
        var ct = (p - 0.92) / 0.07;
        ct = ct < 0 ? 0 : ct > 1 ? 1 : ct;
        if (contact && ct !== lastContactT) {
            lastContactT = ct;
            var ce = easeOutCubic(ct);
            contact.style.opacity = ce.toFixed(3);
            contact.style.transform = 'translateY(' + (40 * (1 - ce)).toFixed(1) + 'px)';
            contact.style.pointerEvents = ct > 0.5 ? 'auto' : 'none';
        }
    }

    /* ============ Loop (rAF, passive scroll) ============ */
    var scrollPos = window.scrollY || 0;
    var dirty = true;

    function measure() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildStars();
        initSatellites();
        scheduleNextShoot(performance.now());
        scheduleISS(performance.now());
        if (journey) journeyEnd = Math.max(1, journey.offsetHeight - H);
        dirty = true;
    }

    window.addEventListener('scroll', function () {
        scrollPos = window.scrollY;
        dirty = true;
    }, { passive: true });

    window.addEventListener('resize', measure, { passive: true });

    measure();

    /* ============ UFO-cursor ============ */
    var ufo = document.getElementById('ufo');
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var ufoX = -100, ufoY = -100, targetX = -100, targetY = -100, ufoTilt = 0;
    var pillsExpandMargin = 80; // 80px expansion on top and bottom

    if (!reduced && finePointer && ufo) {
        document.documentElement.classList.add('ufo-on');
        document.addEventListener('mousemove', function (e) {
            targetX = e.clientX;
            targetY = e.clientY;
            if (!ufo.classList.contains('live')) {
                ufoX = targetX; ufoY = targetY;
                ufo.classList.add('live');
            }
        }, { passive: true });

        // Tractor beam over links
        document.querySelectorAll('a').forEach(function (el) {
            el.addEventListener('mouseenter', function () { ufo.classList.add('zap'); });
            el.addEventListener('mouseleave', function () { ufo.classList.remove('zap'); });
        });
    }

    function updateUfo() {
        var dx = targetX - ufoX;
        ufoX += dx * 0.18;
        ufoY += (targetY - ufoY) * 0.18;
        var tilt = Math.max(-22, Math.min(22, dx * 0.6));
        ufoTilt += (tilt - ufoTilt) * 0.15;
        ufo.style.transform = 'translate3d(' + (ufoX - 24).toFixed(1) + 'px,' +
            (ufoY - 18).toFixed(1) + 'px,0) rotate(' + ufoTilt.toFixed(2) + 'deg)';

        // Check if UFO is within expanded hover zone of any pill
        var pillsList = document.querySelector('.pills');
        if (pillsList) {
            var pills = pillsList.querySelectorAll('.pill');
            var inPillZone = false;
            for (var i = 0; i < pills.length; i++) {
                var rect = pills[i].getBoundingClientRect();
                // Expand the hover area vertically by pillsExpandMargin on top and bottom
                var expandedTop = rect.top - pillsExpandMargin;
                var expandedBottom = rect.bottom + pillsExpandMargin;
                var expandedLeft = rect.left;
                var expandedRight = rect.right;

                if (ufoX + 24 >= expandedLeft && ufoX + 24 <= expandedRight &&
                    ufoY + 18 >= expandedTop && ufoY + 18 <= expandedBottom) {
                    inPillZone = true;
                    break;
                }
            }
            if (inPillZone) {
                ufo.classList.add('zap');
            } else {
                ufo.classList.remove('zap');
            }
        }
    }

    if (reduced) {
        // Statisk: ét frame, ingen bevægelse, ingen rejse (skjult via CSS)
        drawStars(0, 0);
        window.addEventListener('resize', function () { drawStars(0, 0); }, { passive: true });
    } else {
        splitLetters();
        updateLetters(0);
        var ufoActive = finePointer && ufo;
        (function frame(time) {
            drawStars(scrollPos, time);
            if (dirty) {
                dirty = false;
                var p = scrollPos / journeyEnd;
                updateLetters(p < 0 ? 0 : p > 1 ? 1 : p);
            }
            if (ufoActive) updateUfo();
            requestAnimationFrame(frame);
        })(0);
    }
})();
