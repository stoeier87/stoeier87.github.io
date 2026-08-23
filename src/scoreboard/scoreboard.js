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
import { definePlanetField } from "../shared/elements/planet-field.ts";
import { ZODIAC_SIGNS } from "../shared/elements/zodiac-data.ts";

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
if (sky) {
  sky.constellations = ZODIAC_SIGNS;
  // Sparser and dimmer than the homepage default -- the 12 constellation
  // figures are the focal decoration here, and a busy background star field
  // competes with them instead of framing them.
  sky.starLayers = [
    { density: 32000, sizeMin: 0.4, sizeMax: 0.9, parallax: 0.08, alpha: 0.35 },
    { density: 20000, sizeMin: 0.8, sizeMax: 1.4, parallax: 0.22, alpha: 0.55 },
  ];
  addEventListener("resize", () => sky.resize(), { passive: true });
  requestAnimationFrame(function loop(t) {
    sky.tick(t);
    requestAnimationFrame(loop);
  });

  if (zodiacLabel) {
    sky.addEventListener("constellation-enter", (e) => {
      const { name, dateRange } = e.detail.constellation;
      zodiacLabel.textContent = dateRange ? `${name} · ${dateRange}` : name;
      zodiacLabel.classList.remove("hidden");
    });
    sky.addEventListener("constellation-leave", () => {
      zodiacLabel.classList.add("hidden");
    });
  }
}

const GAMES = [
  { key: "mercury", label: "Orbit Runner — Mercury" },
  { key: "venus", label: "Meteor Dodge — Venus" },
  { key: "earth", label: "ISS Docking — Earth" },
  { key: "mars", label: "Phobos Lander — Mars" },
  { key: "jupiter", label: "Galileo — Jupiter" },
  { key: "saturn", label: "Star Memory — Saturn" },
  { key: "uranus", label: "Nebula Trail — Uranus" },
  { key: "neptune", label: "Diamond Rain — Neptune" },
  { key: "pluto", label: "Ice Fall — Pluto" },
];

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
  return visible
    .map(
      (r, i) => `
    <tr data-rank="${i + 1}">
      <td class="rank">${i + 1}</td>
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
      <h2>${escapeHtml(game.label)}</h2>
      <span class="top-score">—</span>
    </div>
    <div class="board-card-body">
      <table>
        <thead><tr><th class="rank">#</th><th>Name</th><th class="col-score">Score</th></tr></thead>
        <tbody class="board-tbody"><tr class="loading-row"><td colspan="3">Loading…</td></tr></tbody>
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
        card.style.display = "none";
        return;
      }

      card.style.display = "";
      topScoreEl.textContent = Number(allRows[0].score).toLocaleString();

      // Update expand button if needed
      updateExpandBtn();
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
