import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js";
import {
  getDatabase,
  ref,
  push,
  query,
  orderByChild,
  limitToLast,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { ARCADE_FIREBASE_CONFIG } from "./firebase-config.js";

const app = initializeApp(ARCADE_FIREBASE_CONFIG, "arcade-game");

// reCAPTCHA v3 only verifies registered domains; localhost needs a debug
// token instead (register it once in Firebase console > App Check > Apps).
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(ARCADE_FIREBASE_CONFIG.appCheckSiteKey),
  isTokenAutoRefreshEnabled: true,
});

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
    defaultName: String(
      options?.defaultName ?? localStorage.getItem("arcade_player_name") ?? "",
    ).trim(),
    minNameLength: Number(options?.minNameLength ?? DEFAULTS.minNameLength),
    maxNameLength: Number(options?.maxNameLength ?? DEFAULTS.maxNameLength),
    minScore: Number(options?.minScore ?? DEFAULTS.minScore),
  };
}

// Fully self-contained (inline styles only, no shared or page-local class
// names) because this module is injected into all 8 arcade pages and half
// of them redefine .restart-btn locally (display:none by default, toggled
// by their own JS) — reusing that class name silently hid this modal's
// buttons on those pages. Never reuse .gameover/.gameover-card/.restart-btn
// here; a naming collision on any current or future page would recreate
// the same bug.
//
// The overlay is appended to the DOM synchronously, before any network
// call — otherwise there's a gap where a player can hit the page's own
// Restart button (now covered but not yet blocked) before this mounts,
// and the modal then pops up late on top of a game that's already back
// in progress. Best/qualifies fill in once the leaderboard fetch resolves.
function showScoreModal({ gameKey, gameLabel, score, defaultName }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(4,7,14,.68);";

    const card = document.createElement("div");
    card.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:14px;min-width:280px;max-width:min(88vw,360px);padding:26px 30px;border-radius:14px;border:1.5px solid rgba(245,215,154,.6);background:rgba(10,14,24,.94);text-align:center;";

    const title = document.createElement("div");
    title.style.cssText =
      "font:900 26px \"Archivo Black\",sans-serif;letter-spacing:.02em;color:#f5d79a;";
    title.textContent = "GAME OVER";
    card.appendChild(title);

    const scoreLine = document.createElement("div");
    scoreLine.style.cssText =
      "font:700 15px \"Space Mono\",monospace;color:rgba(255,255,255,.85);letter-spacing:.05em;";
    scoreLine.textContent = `${gameLabel} — Score ${score}`;
    card.appendChild(scoreLine);

    const bestLine = document.createElement("div");
    bestLine.style.cssText =
      "font:700 13px \"Space Mono\",monospace;color:rgba(255,255,255,.55);letter-spacing:.05em;";
    bestLine.textContent = "Best —";
    card.appendChild(bestLine);

    const btnStyle =
      "padding:12px 22px;min-width:110px;border-radius:10px;border:2px solid rgba(245,215,154,.6);background:rgba(10,14,24,.82);color:#fff;font:700 13px \"Space Mono\",monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;touch-action:manipulation;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;";
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function cleanup() {
      overlay.remove();
    }

    const skipBtn = document.createElement("button");
    skipBtn.style.cssText = btnStyle;
    skipBtn.type = "button";
    skipBtn.textContent = "Skip";
    skipBtn.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
    btnRow.appendChild(skipBtn);

    fetchTopScores(gameKey, 5).then((top5) => {
      const best = top5[0]?.score ?? 0;
      const qualifies = top5.length < 5 || score > top5[top5.length - 1].score;
      bestLine.textContent = `Best ${best}`;
      if (!qualifies) {
        skipBtn.textContent = "Close";
        return;
      }

      title.textContent = "TOP 5!";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Your name";
      input.value = defaultName || "";
      input.maxLength = 20;
      input.style.cssText =
        "width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.25);background:rgba(4,7,14,.7);color:#fff;font:700 13px \"Space Mono\",monospace;letter-spacing:.04em;text-align:center;";
      card.insertBefore(input, btnRow);

      const submitBtn = document.createElement("button");
      submitBtn.style.cssText = btnStyle;
      submitBtn.type = "button";
      submitBtn.textContent = "Submit";
      const submit = () => {
        cleanup();
        resolve(input.value.trim());
      };
      submitBtn.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });
      btnRow.insertBefore(submitBtn, skipBtn);
      input.focus();
    });
  });
}

function validatePayload({
  gameKey,
  score,
  name,
  minNameLength,
  maxNameLength,
  minScore,
}) {
  if (!gameKey) {
    return { ok: false, reason: "Missing game key." };
  }
  if (!Number.isFinite(score) || score < minScore) {
    return { ok: false, reason: "Invalid score." };
  }
  if (!name || name.length < minNameLength) {
    return {
      ok: false,
      reason: `Name must be at least ${minNameLength} characters.`,
    };
  }
  return {
    ok: true,
    safeName: name.slice(0, maxNameLength),
    safeScore: Math.floor(score),
  };
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

  const validation = validatePayload({
    gameKey,
    score: Number(score),
    name: String(name).trim(),
    minNameLength,
    maxNameLength,
    minScore,
  });
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
      payload: {
        game: gameKey,
        name: validation.safeName,
        score: validation.safeScore,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      submitted: false,
      cancelled: false,
      reason: "Could not save score. Check Firebase config/rules.",
      error: err,
    };
  }
}

export async function submitScoreOnGameOver(options = {}) {
  const cfg = normalizeOptions(options);
  const flooredScore = Math.floor(cfg.score);

  let name = cfg.defaultName;
  if (cfg.ask) {
    const entered = await showScoreModal({
      gameKey: cfg.gameKey,
      gameLabel: cfg.gameLabel,
      score: flooredScore,
      defaultName: cfg.defaultName,
    });
    if (entered === null) {
      return {
        submitted: false,
        cancelled: true,
        reason: "User skipped submission.",
      };
    }
    name = entered;
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

/**
 * Fetches the global best (highest) score for a game from Firebase.
 * Falls back to 0 on error.
 *
 * @param {string} gameKey
 * @returns {Promise<number>}
 */
export async function fetchGlobalBest(gameKey) {
  try {
    const scoresRef = ref(db, `arcade/scores/${gameKey}`);
    const top1 = query(scoresRef, orderByChild("score"), limitToLast(1));
    const snapshot = await get(top1);
    let best = 0;
    snapshot.forEach((child) => {
      const s = Number(child.val()?.score ?? 0);
      if (s > best) best = s;
    });
    return best;
  } catch {
    return 0;
  }
}

/**
 * Fetches the top N scores for a game, highest first. Falls back to an
 * empty array on error.
 *
 * @param {string} gameKey
 * @param {number} n
 * @returns {Promise<Array<{ name: string, score: number }>>}
 */
export async function fetchTopScores(gameKey, n = 5) {
  try {
    const scoresRef = ref(db, `arcade/scores/${gameKey}`);
    const topN = query(scoresRef, orderByChild("score"), limitToLast(n));
    const snapshot = await get(topN);
    const list = [];
    snapshot.forEach((child) => {
      const v = child.val() || {};
      list.push({ name: String(v.name ?? "???"), score: Number(v.score ?? 0) });
    });
    list.sort((a, b) => b.score - a.score);
    return list;
  } catch {
    return [];
  }
}
