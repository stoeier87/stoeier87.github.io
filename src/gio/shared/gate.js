import { GIO_CODE } from "./code.js";

/**
 * Kodelågen foran alt under /gio — én modul, alle tre sider kalder
 * guardPage(), så et direkte link til en underside møder præcis samme
 * låge som forsiden.
 *
 * Client-side og med vilje: det her er en låge, ikke sikkerhed. Den
 * holder tilfældige forbipasserende ude, intet mere.
 *
 * Husker oplåsningen i 30 dage i localStorage (samme mekanisme som
 * arcade_player_name), og "lås igen"-linket i hjørnet rydder den, så
 * lågen kan testes uden at rydde hele browseren.
 */

const STORAGE_KEY = "gio_unlocked_until";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function isUnlocked() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) > Date.now();
  } catch {
    return false;
  }
}

function unlock() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + THIRTY_DAYS_MS));
  } catch {
    /* uden storage virker lågen stadig — den husker bare ikke besøget */
  }
}

function lockAgain() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* intet at rydde */
  }
  location.reload();
}

function codeMatches(input) {
  return input.trim().toLowerCase() === GIO_CODE.trim().toLowerCase();
}

function mountSignOut() {
  const link = document.createElement("button");
  link.type = "button";
  link.textContent = "lås igen";
  link.className =
    "fixed right-3 bottom-3 z-40 cursor-pointer font-mono text-[11px] tracking-wide text-text-dim transition-colors hover:text-text-muted focus-visible:outline-2 focus-visible:outline-accent";
  link.addEventListener("click", lockAgain);
  document.body.appendChild(link);
}

function reveal(main) {
  main.hidden = false;
  if (!reduced) {
    main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" });
  }
  mountSignOut();
}

function mountGate(main, onRevealed) {
  const overlay = document.createElement("div");
  overlay.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-bg-deep px-6 text-center";
  overlay.innerHTML = `
    <form class="flex w-full max-w-xs flex-col items-center gap-5">
      <p class="font-mono text-sm tracking-loose text-text-muted">Kun for Gio.</p>
      <label class="sr-only" for="gioCode">Kode</label>
      <input
        id="gioCode"
        type="password"
        autocomplete="off"
        autocapitalize="none"
        class="w-full rounded-hud border-[1.5px] border-border bg-[rgba(4,7,14,0.7)] px-4 py-3 text-center font-mono text-sm tracking-wide text-ink focus-visible:outline-2 focus-visible:outline-accent"
      />
      <button type="submit" class="pill px-8">LUK OP</button>
      <p id="gioTryAgain" class="text-xs text-text-dim" aria-live="polite" hidden>Prøv igen.</p>
    </form>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector("form");
  const input = overlay.querySelector("#gioCode");
  const tryAgain = overlay.querySelector("#gioTryAgain");
  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (codeMatches(input.value)) {
      unlock();
      if (reduced) {
        overlay.remove();
        reveal(main);
        onRevealed();
      } else {
        const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 300,
          easing: "ease-in",
        });
        fade.onfinish = () => {
          overlay.remove();
          reveal(main);
          onRevealed();
        };
      }
      return;
    }
    tryAgain.hidden = false;
    if (!reduced) {
      input.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-7px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 320, easing: "ease-out" },
      );
    }
    input.select();
  });
}

/**
 * Kald fra hver /gio-side med sidens <main hidden>. Returnerer et løfte
 * der løses når indholdet er synligt — dagbogen bruger det til først at
 * markere dagens besked som læst, når den faktisk er blevet vist.
 */
export function guardPage() {
  const main = document.querySelector("main");
  return new Promise((resolve) => {
    if (isUnlocked()) {
      reveal(main);
      resolve();
      return;
    }
    mountGate(main, resolve);
  });
}
