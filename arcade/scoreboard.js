import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getDatabase, ref, push, query, orderByChild, limitToLast, onValue
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

// Paste your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyDTebLTN13VnxG6tKoN5XsSk0OEg49Yz4s",
  authDomain: "servicedesign-e1fe5.firebaseapp.com",
  projectId: "servicedesign-e1fe5",
  storageBucket: "servicedesign-e1fe5.firebasestorage.app",
  messagingSenderId: "485465422440",
  appId: "1:485465422440:web:2c8a02a1a9794b773419dd",
  measurementId: "G-9M0GB4HHY0",
  databaseURL: "https://servicedesign-e1fe5-default-rtdb.europe-west1.firebasedatabase.app/",
};

// Add/edit games here
const GAMES = [
  { key: "orbit-runner", label: "Orbit Runner" },
  { key: "moon-lander", label: "Moon Lander" },
  { key: "iss-docking", label: "ISS Docking" }
];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
listenToGameBoard(gameSelect.value);
