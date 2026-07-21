import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  limitToLast,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { submitScore } from "../arcade/shared/score-submit.js";
import { ARCADE_FIREBASE_CONFIG } from "../arcade/shared/firebase-config.js";

const app = initializeApp(ARCADE_FIREBASE_CONFIG, "arcade-scoreboard");
const db = getDatabase(app);

// Add/edit games here
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

const form = document.getElementById("scoreForm");
const gameSelect = document.getElementById("game");
const currentGameLabel = document.getElementById("currentGameLabel");
const nameInput = document.getElementById("name");
const scoreInput = document.getElementById("score");
const msg = document.getElementById("msg");
const boardBody = document.getElementById("boardBody");

let unsubscribeBoard = null;
let lastSubmitAt = 0;
const COOLDOWN_MS = 3000;

function setMsg(text, type = "") {
  msg.textContent = text;
  msg.className = "msg" + (type ? ` ${type}` : "");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateGames() {
  gameSelect.innerHTML = GAMES.map(
    (g) => `<option value="${g.key}">${g.label}</option>`,
  ).join("");

  const gameFromUrl = new URLSearchParams(location.search).get("game");
  if (gameFromUrl && GAMES.some((g) => g.key === gameFromUrl)) {
    gameSelect.value = gameFromUrl;
  }
}

function listenToGameBoard(gameKey) {
  if (!db) return;
  const gameMeta = GAMES.find((g) => g.key === gameKey);
  currentGameLabel.textContent = gameMeta ? gameMeta.label : gameKey;
  boardBody.innerHTML = `<tr><td colspan="3">Loading…</td></tr>`;

  const scoresRef = ref(db, `arcade/scores/${gameKey}`);
  const topQuery = query(scoresRef, orderByChild("score"), limitToLast(10));

  if (unsubscribeBoard) unsubscribeBoard();

  unsubscribeBoard = onValue(topQuery, (snapshot) => {
    const rows = [];
    snapshot.forEach((child) => rows.push(child.val()));

    console.log(
      `[Scoreboard] Query returned ${rows.length} records for ${gameKey}`,
      rows,
    );

    rows.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

    if (!rows.length) {
      boardBody.innerHTML = `<tr><td colspan="3">No scores yet — be the first!</td></tr>`;
      return;
    }

    boardBody.innerHTML = rows
      .map(
        (r, i) => `
      <tr>
        <td class="rank">${i + 1}</td>
        <td>${escapeHtml(r.name ?? "Unknown")}</td>
        <td class="score">${Number(r.score ?? 0).toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");
  });
}

gameSelect.addEventListener("change", () => {
  const gameKey = gameSelect.value;
  const url = new URL(location.href);
  url.searchParams.set("game", gameKey);
  history.replaceState({}, "", url);
  listenToGameBoard(gameKey);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const now = Date.now();
  if (now - lastSubmitAt < COOLDOWN_MS) {
    setMsg("Please wait a few seconds before submitting again.", "bad");
    return;
  }

  const gameKey = gameSelect.value;
  const name = nameInput.value.trim();
  const score = Number(scoreInput.value);

  if (!GAMES.some((g) => g.key === gameKey)) {
    setMsg("Invalid game selected.", "bad");
    return;
  }

  const result = await submitScore(db, { gameKey, name, score });

  if (result.submitted) {
    lastSubmitAt = now;
    setMsg(
      `Score saved for ${GAMES.find((g) => g.key === gameKey)?.label || gameKey}!`,
      "good",
    );
    form.reset();
    gameSelect.value = gameKey;
    nameInput.focus();
  } else {
    setMsg(result.reason, "bad");
  }
});

// init
populateGames();
listenToGameBoard(gameSelect.value);
