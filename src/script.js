import { definePlanetField } from "./shared/elements/planet-field.ts";
import { color } from "./tokens.ts";

(function () {
  "use strict";

  document.documentElement.classList.add("js-anim");
  definePlanetField();

  /**
   * The hash PRNG the letter scatter is seeded from. It used to live at the top
   * of the starfield section; the starfield moved into <st-planet-field>, this
   * did not, because "Bogstav-rejsen" depends on it and the whole point of that
   * seed is that the name assembles the same way every visit.
   */
  function rand(seed) {
    let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ============ Planeter ============
     Nu 9 planeter — Pluto kom med (issue #61). Data er props, ikke kode:
     hele listen sendes til <st-planet-field>, som ejer selve tegningen.

     Every link is relative. They were `/arcade/<game>` here for a long time
     (known issue 1, BACKLOG B1) and that is exactly the bug base: "./" means
     the same build serves stoeier.dk and /preview/<topic>/, and a root-absolute
     link jumped a preview visitor onto production without telling them. The
     element does not carry URLs at all now, so this is the only place they
     exist and there is nothing left to get wrong. */
  let PLANETS = [
    {
      name: "MERKUR",
      r: 0.02,
      s0: 0.06,
      px: 0.8,
      pf: 0.42,
      hi: color.planet.merkurHi,
      lo: color.planet.merkurLo,
      spin: 0.05,
      link: "./arcade/orbit-runner/",
    },
    {
      name: "VENUS",
      r: 0.034,
      s0: 0.16,
      px: 0.16,
      pf: 0.5,
      hi: color.planet.venusHi,
      lo: color.planet.venusLo,
      spin: 0.035,
      link: "./arcade/meteor-dodge/",
    },
    {
      name: "JORDEN",
      r: 0.04,
      s0: 0.27,
      px: 0.83,
      pf: 0.58,
      hi: color.planet.jordenHi,
      lo: color.planet.jordenLo,
      earth: true,
      spin: 0.08,
      link: "./arcade/iss-docking/",
    },
    {
      name: "MARS",
      r: 0.028,
      s0: 0.38,
      px: 0.14,
      pf: 0.46,
      hi: color.planet.marsHi,
      lo: color.planet.marsLo,
      spin: 0.075,
      link: "./arcade/phobos-lander/",
    },
    {
      name: "JUPITER",
      r: 0.105,
      s0: 0.52,
      px: 0.85,
      pf: 0.62,
      hi: color.planet.jupiterHi,
      lo: color.planet.jupiterLo,
      bands: true,
      spin: 0.16,
      link: "./arcade/comet-pong/",
    },
    {
      name: "SATURN",
      r: 0.08,
      s0: 0.67,
      px: 0.16,
      pf: 0.55,
      hi: color.planet.saturnHi,
      lo: color.planet.saturnLo,
      ring: true,
      spin: 0.15,
      link: "./arcade/star-memory/",
    },
    {
      name: "URANUS",
      r: 0.042,
      s0: 0.8,
      px: 0.82,
      pf: 0.48,
      hi: color.planet.uranusHi,
      lo: color.planet.uranusLo,
      ring: true,
      spin: 0.09,
      link: "./arcade/nebula-trail/",
    },
    {
      name: "NEPTUN",
      r: 0.046,
      s0: 0.9,
      px: 0.15,
      pf: 0.6,
      hi: color.planet.neptunHi,
      lo: color.planet.neptunLo,
      spin: 0.095,
      link: "./arcade/asteroid-breaker/",
    },
    {
      // Den niende. Ingen spil endnu, så Pluto sender dig til hele arkaden.
      // s0 er 0.97 og pf er lav med vilje: højere op og den ville lande oven i
      // Neptun, lavere og ±3r-cullingen ville skjule den før rejsen er slut.
      name: "PLUTO",
      r: 0.014,
      s0: 0.97,
      px: 0.72,
      pf: 0.44,
      hi: color.planet.plutoHi,
      lo: color.planet.plutoLo,
      spin: 0.03,
      link: "./arcade/",
    },
  ];

  /* ============ Himlen ============
     <st-planet-field> owns stars, planets, shooting stars and satellites. It
     carries the `driven` attribute, so it does NOT start a loop of its own —
     the single rAF loop at the bottom of this file calls tick() on it. That is
     standards.json `one-raf-loop`, which is fatal, and it is why the element
     has a driven mode at all. */
  let sky = document.getElementById("sky");
  if (sky) {
    sky.planets = PLANETS;
    sky.addEventListener("planet-activate", function (e) {
      let link = e.detail && e.detail.planet && e.detail.planet.link;
      if (link) window.location.href = link;
    });
    // A pointer-events: none canvas cannot show a cursor, so the affordance is
    // on <html> instead. The element brightens the planet's glow to match.
    sky.addEventListener("planet-enter", function () {
      document.documentElement.classList.add("planet-hover");
    });
    sky.addEventListener("planet-leave", function () {
      document.documentElement.classList.remove("planet-hover");
    });
  }

  /* ============ Bogstav-rejsen ============
     Letters fly in and assemble the name during the first part of the
     scroll. Each letter's local window is clamped [0,1] and simply holds
     its resting transform once its window has passed — it settles into
     place and stays there, it does not re-scatter later in the scroll. */
  let journey = document.querySelector(".journey");
  let hint = document.getElementById("hint");
  let contact = document.getElementById("contact");
  let arcadePills = document.getElementById("arcadePills");
  let stageName = document.getElementById("stageName");
  let letters = [];
  let journeyEnd = 1;
  let lastContactT = -1;
  let lastArcadePillsT = -1;
  let stageParallaxMax = 38; // px

  let WINDOWS = [
    [0.03, 0.3],
    [0.36, 0.62],
    [0.68, 0.9],
  ];

  function splitLetters() {
    let words = document.querySelectorAll("#stageName .word");
    let idx = 0;
    words.forEach(function (word, wi) {
      let chars = Array.from(word.textContent);
      word.textContent = "";
      let n = chars.length;
      chars.forEach(function (ch, ci) {
        let span = document.createElement("span");
        span.className = "ltr";
        span.textContent = ch;
        word.appendChild(span);
        let w0 = WINDOWS[wi][0],
          w1 = WINDOWS[wi][1],
          range = w1 - w0;
        let seed = idx * 13 + 5,
          angle = rand(seed + 1) * Math.PI * 2;
        let vmax = Math.max(window.innerWidth, window.innerHeight);
        letters.push({
          el: span,
          t0: w0 + (ci / n) * range * 0.65,
          dur: range * 0.35,
          dx: Math.cos(angle) * (0.55 + rand(seed + 2) * 0.7) * vmax,
          dy: Math.sin(angle) * (0.55 + rand(seed + 3) * 0.7) * vmax,
          scale: 0.3 + rand(seed + 4) * 2.4,
          rot: (rand(seed + 5) - 0.5) * 90,
          last: -1,
        });
        idx++;
      });
      word.style.visibility = "visible";
    });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function updateHeadline(p) {
    for (let i = 0; i < letters.length; i++) {
      let l = letters[i];
      let t = (p - l.t0) / l.dur;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (t === l.last) continue;
      l.last = t;
      let e = easeOutCubic(t),
        inv = 1 - e;
      l.el.style.transform =
        "translate3d(" +
        (l.dx * inv).toFixed(1) +
        "px," +
        (l.dy * inv).toFixed(1) +
        "px,0) rotate(" +
        (l.rot * inv).toFixed(2) +
        "deg) scale(" +
        (l.scale + (1 - l.scale) * e).toFixed(3) +
        ")";
      l.el.style.opacity = Math.min(1, e * 1.8).toFixed(3);
    }

    // Headline moves as one unit: parallax resolves to centered at end (p=1 => y=0)
    if (stageName) {
      let y = (1 - p) * stageParallaxMax;
      stageName.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
    }

    if (hint) hint.style.opacity = p > 0.02 ? "0" : "1";

    let ct = (p - 0.92) / 0.07;
    ct = ct < 0 ? 0 : ct > 1 ? 1 : ct;

    if (arcadePills && ct !== lastArcadePillsT) {
      lastArcadePillsT = ct;
      let ce = easeOutCubic(ct);
      arcadePills.style.opacity = ce.toFixed(3);
      arcadePills.style.transform =
        "translateY(" + (-40 * (1 - ce)).toFixed(1) + "px)";
      arcadePills.style.pointerEvents = ct > 0.5 ? "auto" : "none";
    }

    if (contact && ct !== lastContactT) {
      lastContactT = ct;
      let ce = easeOutCubic(ct);
      contact.style.opacity = ce.toFixed(3);
      contact.style.transform =
        "translateY(" + (40 * (1 - ce)).toFixed(1) + "px)";
      contact.style.pointerEvents = ct > 0.5 ? "auto" : "none";
    }
  }

  /* ============ Loop ============ */
  let scrollPos = window.scrollY || 0;
  let dirty = true;

  /* Canvas sizing, DPR and star rebuilding all moved into the element, which
     does its own resize handling. What is left here is the one number the
     element cannot know: how tall the scroll journey is. */
  function measure() {
    if (journey) journeyEnd = Math.max(1, journey.offsetHeight - window.innerHeight);
    if (sky) sky.journeyEnd = journeyEnd;
    const topbarEl = document.querySelector(".topbar");
    if (topbarEl) document.documentElement.style.setProperty("--topbar-h", topbarEl.offsetHeight + "px");
    dirty = true;
  }

  let titleSats = [];
  function initTitleSats() {
    let stage = document.querySelector(".stage");
    for (let i = 0; i < 4; i++) {
      let el = document.createElement("span");
      el.className = "title-sat";
      stage.appendChild(el);
      titleSats.push({
        el: el,
        a: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0007,
        rx: 140 + Math.random() * 120,
        ry: 45 + Math.random() * 40,
      });
    }
  }

  function updateTitleSats(time) {
    if (!stageName) return;
    let r = stageName.getBoundingClientRect();
    let cx = r.left + r.width / 2;
    let cy = r.top + r.height / 2;

    for (let i = 0; i < titleSats.length; i++) {
      let s = titleSats[i];
      let ang = s.a + time * s.speed;
      let x = cx + Math.cos(ang) * s.rx;
      let y = cy + Math.sin(ang) * s.ry;
      s.el.style.transform =
        "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      scrollPos = window.scrollY;
      dirty = true;
    },
    { passive: true },
  );
  window.addEventListener("resize", measure, { passive: true });
  measure();

  /* ============ UFO-cursor ============ */
  let ufo = document.getElementById("ufo");
  let finePointer = window.matchMedia("(pointer: fine)").matches;
  let ufoX = -100,
    ufoY = -100,
    targetX = -100,
    targetY = -100,
    ufoTilt = 0;
  let pillsExpandMargin = 80;

  if (finePointer && ufo) {
    document.documentElement.classList.add("ufo-on");
    document.addEventListener(
      "mousemove",
      function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!ufo.classList.contains("live")) {
          ufoX = targetX;
          ufoY = targetY;
          ufo.classList.add("live");
        }
      },
      { passive: true },
    );

    document.querySelectorAll("a").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        ufo.classList.add("zap");
      });
      el.addEventListener("mouseleave", function () {
        ufo.classList.remove("zap");
      });
    });
  }

  function updateUfo() {
    let dx = targetX - ufoX;
    ufoX += dx * 0.18;
    ufoY += (targetY - ufoY) * 0.18;
    let tilt = Math.max(-22, Math.min(22, dx * 0.6));
    ufoTilt += (tilt - ufoTilt) * 0.15;
    ufo.style.transform =
      "translate3d(" +
      (ufoX - 24).toFixed(1) +
      "px," +
      (ufoY - 18).toFixed(1) +
      "px,0) rotate(" +
      ufoTilt.toFixed(2) +
      "deg)";

    let pillsList = document.querySelector(".pills");
    if (pillsList) {
      let pills = pillsList.querySelectorAll(".pill"),
        inPillZone = false;
      for (let i = 0; i < pills.length; i++) {
        let rect = pills[i].getBoundingClientRect();
        let expandedTop = rect.top - pillsExpandMargin,
          expandedBottom = rect.bottom + pillsExpandMargin;
        let expandedLeft = rect.left,
          expandedRight = rect.right;
        if (
          ufoX + 24 >= expandedLeft &&
          ufoX + 24 <= expandedRight &&
          ufoY + 18 >= expandedTop &&
          ufoY + 18 <= expandedBottom
        ) {
          inPillZone = true;
          break;
        }
      }
      if (inPillZone) ufo.classList.add("zap");
      else ufo.classList.remove("zap");
    }
  }

  /* Reduced-motion users get the finished composition pinned in normal
     flow instead of the scroll-driven journey. This is the only case that
     disables the parallax — it is not tied to viewport width, so phones
     get the same scroll experience as desktop. */
  let motionQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let staticHome = motionQ.matches;

  function applyHomeMode() {
    document.documentElement.classList.toggle("static-home", staticHome);
    if (staticHome) updateHeadline(1);
    else { dirty = true; }
  }

  function onModeChange() {
    let next = motionQ.matches;
    if (next === staticHome) return;
    staticHome = next;
    applyHomeMode();
  }
  motionQ.addEventListener("change", onModeChange);

  splitLetters();
  initTitleSats();
  applyHomeMode();
  if (!staticHome) updateHeadline(0);
  let ufoActive = finePointer && ufo;
  (function frame(time) {
    if (sky) {
      sky.scrollOffset = scrollPos;
      sky.tick(time);
    }
    if (dirty && !staticHome) {
      dirty = false;
      let p = scrollPos / journeyEnd;
      updateHeadline(p < 0 ? 0 : p > 1 ? 1 : p);
    }
    updateTitleSats(time);
    if (ufoActive) updateUfo();
    requestAnimationFrame(frame);
  })(0);
})();
