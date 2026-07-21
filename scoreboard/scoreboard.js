import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  limitToLast,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { ARCADE_FIREBASE_CONFIG } from "../arcade/shared/firebase-config.js";

const app = initializeApp(ARCADE_FIREBASE_CONFIG, "arcade-scoreboard");
const db = getDatabase(app);

const GAMES = [
  { key: "orbit-runner", label: "Orbit Runner" },
  { key: "meteor-dodge", label: "Meteor Dodge" },
  { key: "iss-docking", label: "ISS Docking" },
  { key: "phobos-lander", label: "Phobos Lander" },
  { key: "comet-pong", label: "Comet Pong" },
  { key: "star-memory", label: "Star Memory" },
  { key: "nebula-trail", label: "Nebula Trail" },
  { key: "asteroid-breaker", label: "Asteroid Breaker" },
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
