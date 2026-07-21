import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { ARCADE_FIREBASE_CONFIG } from "./firebase-config.js";

const app = initializeApp(ARCADE_FIREBASE_CONFIG, 'arcade-game');
const db = getDatabase(app);

const DEFAULTS = {
  minNameLength: 2,
  maxNameLength: 20,
  minScore: 0,
};

function normalizeOptions(options) {
  return {
    gameKey: options?.gameKey ?? "",
    gameLabel: options?.gameLabel ?? options?.gameKey ?? "Game",
    score: Number(options?.score ?? NaN),
    ask: options?.ask !== false,
    defaultName: String(options?.defaultName ?? localStorage.getItem("arcade_player_name") ?? "").trim(),
    minNameLength: Number(options?.minNameLength ?? DEFAULTS.minNameLength),
    maxNameLength: Number(options?.maxNameLength ?? DEFAULTS.maxNameLength),
    minScore: Number(options?.minScore ?? DEFAULTS.minScore),
  };
}

function promptForName(defaultName, gameLabel, score) {
  const text = `Game over! Submit your score to ${gameLabel} leaderboard?\nScore: ${score}`;
  if (!window.confirm(text)) return null;

  const name = window.prompt("Enter your player name:", defaultName || "") ?? "";
  return name.trim();
}

function validatePayload({ gameKey, score, name, minNameLength, maxNameLength, minScore }) {
  if (!gameKey) {
    return { ok: false, reason: "Missing game key." };
  }
  if (!Number.isFinite(score) || score < minScore) {
    return { ok: false, reason: "Invalid score." };
  }
  if (!name || name.length < minNameLength) {
    return { ok: false, reason: `Name must be at least ${minNameLength} characters.` };
  }
  return { ok: true, safeName: name.slice(0, maxNameLength), safeScore: Math.floor(score) };
}

/**
 * Low-level submit: validates the entry and pushes it to the given Realtime
 * Database instance.  No prompts are shown — callers are responsible for
 * collecting name/score before calling this function.
 *
 * @param {import("firebase/database").Database} db
 * @param {{ gameKey: string, name: string, score: number,
 *           minNameLength?: number, maxNameLength?: number,
 *           minScore?: number }} options
 * @returns {Promise<{ submitted: boolean, cancelled: boolean, reason: string,
 *                     payload?: object, error?: unknown }>}
 */
export async function submitScore(db, options = {}) {
  const {
    gameKey = "",
    name = "",
    score = NaN,
    minNameLength = DEFAULTS.minNameLength,
    maxNameLength = DEFAULTS.maxNameLength,
    minScore = DEFAULTS.minScore,
  } = options;

  const validation = validatePayload({ gameKey, score: Number(score), name: String(name).trim(), minNameLength, maxNameLength, minScore });
  if (!validation.ok) {
    return { submitted: false, cancelled: false, reason: validation.reason };
  }

  try {
    const scoresRef = ref(db, `arcade/scores/${gameKey}`);
    await push(scoresRef, {
      game: gameKey,
      name: validation.safeName,
      score: validation.safeScore,
      createdAt: Date.now(),
    });

    return {
      submitted: true,
      cancelled: false,
      reason: "Score submitted.",
      payload: { game: gameKey, name: validation.safeName, score: validation.safeScore },
    };
  } catch (err) {
    console.error(err);
    return { submitted: false, cancelled: false, reason: "Could not save score. Check Firebase config/rules.", error: err };
  }
}

export async function submitScoreOnGameOver(options = {}) {
  const cfg = normalizeOptions(options);

  let name = cfg.defaultName;
  if (cfg.ask) {
    const prompted = promptForName(cfg.defaultName, cfg.gameLabel, Math.floor(cfg.score));
    if (prompted === null) {
      return { submitted: false, cancelled: true, reason: "User declined submission." };
    }
    name = prompted;
  }

  const result = await submitScore(db, {
    gameKey: cfg.gameKey,
    name,
    score: cfg.score,
    minNameLength: cfg.minNameLength,
    maxNameLength: cfg.maxNameLength,
    minScore: cfg.minScore,
  });

  if (result.submitted) {
    localStorage.setItem("arcade_player_name", result.payload.name);
  }

  return result;
}
