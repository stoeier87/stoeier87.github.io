import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js";
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  limitToLast,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { ARCADE_FIREBASE_CONFIG } from "../arcade/shared/firebase-config.js";
import { GAMES } from "../arcade/shared/games-data.js";
import { definePlanetField } from "../shared/elements/planet-field.ts";
import { definePageHeader } from "../shared/elements/page-header.ts";
import { defineHallNav } from "../shared/elements/hall-nav.ts";
import { ZODIAC_SIGNS, ZODIAC_SIGNS_SCATTERED } from "../shared/elements/zodiac-data.ts";

definePageHeader();
defineHallNav();

const app = initializeApp(ARCADE_FIREBASE_CONFIG, "arcade-scoreboard");

// reCAPTCHA v3 only verifies registered domains; localhost needs a debug
// token instead (register it once in Firebase console > App Check > Apps).
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
// App Check's reCAPTCHA v3 loader references a Node `process` global that
// doesn't exist when this module is loaded raw over CDN (no bundler).
window.process ??= { env: {} };
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(ARCADE_FIREBASE_CONFIG.appCheckSiteKey),
  isTokenAutoRefreshEnabled: true,
});

const db = getDatabase(app);

/* Background — <st-planet-field> with the 12 zodiac signs instead of
   planets. `driven` because this page owns the one rAF loop below;
   `interactive` (set on the element in index.html) turns on hover, which
   brightens the sign under the pointer and fires constellation-enter/leave
   — picked up below to show its name and date range. `cursor-motion="rotate"`
   rocks the whole sky a few degrees toward the pointer. */
definePlanetField();
const sky = document.getElementById("bg");
const zodiacLabel = document.getElementById("zodiac-label");
// Touch/narrow viewports (<640px) get a scattered, non-grid layout with
// hover interactivity switched off entirely -- ambient background art, not
// a UI element. Desktop is unchanged. Checked once at load rather than on
// resize: this is a layout/interactivity mode, not something that should
// flip mid-session as a window is dragged narrower.
const isMobileSky = matchMedia("(max-width: 639px)").matches;

if (sky) {
  sky.constellations = isMobileSky ? ZODIAC_SIGNS_SCATTERED : ZODIAC_SIGNS;
  if (isMobileSky) {
    // Removing the attribute (not just ignoring the JS property) is what
    // actually matters -- tick() reads `this.interactive` fresh every frame
    // via hasAttribute, so this alone is what stops #updateHover() from
    // ever running: no grow-on-hover, no colour bloom past the 10% resting
    // tint, no zodiac-label tooltip, no cursor:none.
    sky.removeAttribute("interactive");
  }
  // Sparser and dimmer than the homepage default -- the 12 constellation
  // figures are the focal decoration here, and a busy background star field
  // competes with them instead of framing them. The first, second and last
  // entries are hand-tuned; the density on each already sits close to a
  // Fibonacci weight (34, 21, ...2) times ~940, so the four layers between
  // them fill in the missing weights (13, 8, 5, 3) at that same scale rather
  // than a plain halving -- count grows toward the back layers roughly the
  // way a real sky's star count grows as magnitude gets fainter, and each
  // step's size/alpha/parallax is interpolated between its neighbours. New
  // layers stay at or under size 1; only the hand-tuned middle layer keeps
  // its original 1.4.
  sky.starLayers = [
    { density: 32000, sizeMin: 0.4, sizeMax: 0.9, parallax: 0.08, alpha: 0.35 },
    { density: 20000, sizeMin: 0.8, sizeMax: 1.4, parallax: 3.22, alpha: 0.55 },
    { density: 12000, sizeMin: 0.7, sizeMax: 1.0, parallax: 0.42, alpha: 0.6 },
    { density: 7500, sizeMin: 0.55, sizeMax: 0.85, parallax: 0.62, alpha: 0.63 },
    { density: 4700, sizeMin: 0.4, sizeMax: 0.65, parallax: 0.82, alpha: 0.68 },
    { density: 2800, sizeMin: 0.3, sizeMax: 0.5, parallax: 1.0, alpha: 0.72 },
    { density: 2000, sizeMin: 0.2, sizeMax: 0.4, parallax: 1.22, alpha: 0.75 },
  ];
  // Every page shared one hardcoded upper-left white key light plus flat
  // ambient -- fine for a single planet in isolation, but with a full sky of
  // tinted constellations it read as stiff, un-lit. A cool violet key (close
  // to --color-scoreboard-accent) plus a warm gold rim from the opposite
  // corner gives planets and glow sprites a second light source to catch,
  // the classic two-tone trick for making a flat scene feel like a volume.
  // rimOrbitSpeed keeps the rim light from sitting parked at one fixed
  // corner -- it drifts slowly around the scene instead, so which corner is
  // lit warm keeps changing rather than settling into one static pose.
  // rimFollowPointer layers a direct pointer response on top of that drift:
  // move the cursor left/right and the warm highlight visibly swings with
  // it (1.1 rad ~= 63deg of swing at full deflection), so the sky reacts to
  // your movement instead of only rocking (cursor-motion) or drifting on
  // its own (rimOrbitSpeed).
  sky.lighting = {
    keyColor: "#c9d6ff",
    ambientColor: "#c9a6ff",
    rimColor: "#ffcf7a",
    rimIntensity: 1.1,
    rimPosition: { x: 0.6, y: -0.4, z: 0.6 },
    rimOrbitSpeed: 0.035,
    rimFollowPointer: 1.1,
  };
  addEventListener("resize", () => sky.resize(), { passive: true });
  requestAnimationFrame(function loop(t) {
    sky.tick(t);
    requestAnimationFrame(loop);
  });

  if (zodiacLabel) {
    // translate3d rather than left/top so this doesn't force layout on every
    // pointermove -- it's the same technique the label was already using via
    // Tailwind's -translate-x-1/2 before it switched to following the cursor.
    addEventListener(
      "pointermove",
      (e) => {
        zodiacLabel.style.transform = `translate3d(${e.clientX + 5}px, ${e.clientY - 5}px, 0)`;
      },
      { passive: true },
    );
    sky.addEventListener("constellation-enter", (e) => {
      const { name, dateRange, symbol } = e.detail.constellation;
      const label = symbol ? `${symbol} ${name}` : name;
      zodiacLabel.textContent = dateRange ? `${label} · ${dateRange}` : label;
      zodiacLabel.classList.remove("hidden");
      // The floating label already names what's under the pointer, so the
      // system arrow is just noise sitting on top of the growing/glowing
      // shape -- hide it for the duration of the hover.
      document.body.classList.add("zodiac-hover");
    });
    sky.addEventListener("constellation-leave", () => {
      zodiacLabel.classList.add("hidden");
      document.body.classList.remove("zodiac-hover");
    });
  }
}

const PREVIEW = 5;

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRows(rows, expanded) {
  const visible = expanded ? rows : rows.slice(0, PREVIEW);
  const colors = [
    "#FFD700", 
    "#C0C0C0", 
    "#CD7F32"
  ];
  return visible
    .map(
      (r, i) => `
    <tr data-rank="${i + 1}">
      <td class="rank">
        <i class="fa-solid fa-crown ${i > 0 ? "hidden" : ""}" style="color: ${colors[i] ?? "#FFD700"}"></i>
        <span class="rank-number ${i > 0 ? "" : "hidden"}">${i + 1}.</span>  
      </td>
      <td>${escapeHtml(r.name ?? "Unknown")}</td>
      <td class="col-score">${Number(r.score ?? 0).toLocaleString()}</td>
    </tr>`,
    )
    .join("");
}

function createCard(game) {
  const card = document.createElement("div");
  card.className = "board-card is-loading";
  card.innerHTML = `
    <div class="board-card-header">
      <div class="game-labels">
        <h2>${escapeHtml(game.label)}</h2>
        <a href="/arcade/${escapeHtml(game.key)}" class="game-key">(${escapeHtml(game.gameLabel)})</a>
      </div>
      <span class="top-score">—</span>
    </div>
    <div class="board-card-body">
      <table>
        <thead>
          <!-- <tr><th class="rank">#</th><th>Name</th><th class="col-score">Score</th></tr> -->
        </thead>
        <tbody class="board-tbody">
          <tr class="loading-row"><td colspan="3">Loading…</td></tr>
        </tbody>
      </table>
    </div>`;

  let expanded = false;
  let allRows = [];

  const topScoreEl = card.querySelector(".top-score");
  const tbody = card.querySelector(".board-tbody");

  const scoresRef = ref(db, `arcade/scores/${game.key}`);
  const topQuery = query(scoresRef, orderByChild("score"), limitToLast(50));

  onValue(
    topQuery,
    (snapshot) => {
      allRows = [];
      snapshot.forEach((child) => {
        allRows.push(child.val());
      });
      allRows.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

      console.log(
        `[${game.key}] exists:${snapshot.exists()} size:${snapshot.size} rows:${allRows.length}`,
        snapshot.val(),
      );
      card.classList.remove("is-loading");

      if (!allRows.length) {
        // card.style.display = "none";
        return;
      }

      card.style.display = "";
      topScoreEl.textContent = Number(allRows[0].score).toLocaleString();

      // Update expand button if needed
      // updateExpandBtn();
      const html = renderRows(allRows, expanded);
      console.log(
        `[${game.key}] rendering ${allRows.length} rows, html length: ${html.length}, preview rows in html: ${(html.match(/<tr/g) || []).length}`,
      );
      tbody.innerHTML = html;
    },
    (err) => {
      card.classList.remove("is-loading");
      tbody.innerHTML = `<tr class="empty-row"><td colspan="3">Error: ${escapeHtml(err.message)}</td></tr>`;
    },
  );

  function updateExpandBtn() {
    const header = card.querySelector(".board-card-header");
    let btn = header.querySelector(".expand-btn");

    if (allRows.length <= PREVIEW) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement("button");
      btn.className = "expand-btn";
      header.appendChild(btn);
      btn.addEventListener("click", () => {
        expanded = !expanded;
        tbody.innerHTML = renderRows(allRows, expanded);
        btn.textContent = expanded
          ? `▲ Top ${PREVIEW}`
          : `▼ All ${allRows.length}`;
      });
    }

    btn.textContent = expanded ? `▲ Top ${PREVIEW}` : `▼ All ${allRows.length}`;
  }

  return card;
}

const boardsEl = document.getElementById("boards");
for (const game of GAMES) {
  boardsEl.appendChild(createCard(game));
}
