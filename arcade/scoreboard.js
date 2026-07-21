import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getDatabase, ref, push, query, orderByChild, limitToLast, onValue
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

const firebaseConfig = globalThis.ARCADE_FIREBASE_CONFIG;

// Add/edit games here
const GAMES = [
  { key: "orbit-runner", label: "Orbit Runner" },
  { key: "moon-lander", label: "Moon Lander" },
  { key: "iss-docking", label: "ISS Docking" }
];

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getDatabase(app) : null;

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
  gameSelect.innerHTML = GAMES
    .map(g => `<option value="${g.key}">${g.label}</option>`)
    .join("");

  const gameFromUrl = new URLSearchParams(location.search).get("game");
  if (gameFromUrl && GAMES.some(g => g.key === gameFromUrl)) {
    gameSelect.value = gameFromUrl;
  }
}

function listenToGameBoard(gameKey) {
  if (!db) return;

  const gameMeta = GAMES.find(g => g.key === gameKey);
  currentGameLabel.textContent = gameMeta ? gameMeta.label : gameKey;
  boardBody.innerHTML = `<tr><td colspan="3">Loading…</td></tr>`;

  const scoresRef = ref(db, `arcade/scores/${gameKey}`);
  const topQuery = query(scoresRef, orderByChild("score"), limitToLast(10));

  if (unsubscribeBoard) unsubscribeBoard();

  unsubscribeBoard = onValue(topQuery, (snapshot) => {
    const rows = [];
    snapshot.forEach((child) => rows.push(child.val()));

    rows.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

    if (!rows.length) {
      boardBody.innerHTML = `<tr><td colspan="3">No scores yet — be the first!</td></tr>`;
      return;
    }

    boardBody.innerHTML = rows.map((r, i) => `
      <tr>
        <td class="rank">${i + 1}</td>
        <td>${escapeHtml(r.name ?? "Unknown")}</td>
        <td class="score">${Number(r.score ?? 0).toLocaleString()}</td>
      </tr>
    `).join("");
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

  if (!db) {
    setMsg("Scoreboard is not configured.", "bad");
    return;
  }

  const now = Date.now();
  if (now - lastSubmitAt < COOLDOWN_MS) {
    setMsg("Please wait a few seconds before submitting again.", "bad");
    return;
  }

  const gameKey = gameSelect.value;
  const name = nameInput.value.trim();
  const score = Number(scoreInput.value);

  if (!GAMES.some(g => g.key === gameKey)) {
    setMsg("Invalid game selected.", "bad");
    return;
  }
  if (!name || name.length < 2) {
    setMsg("Name must be at least 2 characters.", "bad");
    return;
  }
  if (!Number.isFinite(score) || score < 0) {
    setMsg("Score must be a positive number.", "bad");
    return;
  }

  try {
    const scoresRef = ref(db, `arcade/scores/${gameKey}`);
    await push(scoresRef, {
      game: gameKey,
      name: name.slice(0, 20),
      score: Math.floor(score),
      createdAt: Date.now()
    });

    lastSubmitAt = now;
    setMsg(`Score saved for ${GAMES.find(g => g.key === gameKey)?.label || gameKey}!`, "good");
    form.reset();
    gameSelect.value = gameKey;
    nameInput.focus();
  } catch (err) {
    console.error(err);
    setMsg("Could not save score. Check Firebase config/rules.", "bad");
  }
});

// init
populateGames();
if (!db) {
  gameSelect.disabled = true;
  nameInput.disabled = true;
  scoreInput.disabled = true;
  form.querySelector("button[type='submit']").disabled = true;
  boardBody.innerHTML = `<tr><td colspan="3">Scoreboard not configured.</td></tr>`;
  setMsg("Add arcade/firebase-config.js (see arcade/firebase-config.example.js).", "bad");
} else {
  listenToGameBoard(gameSelect.value);
}
