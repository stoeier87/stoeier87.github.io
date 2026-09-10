import { guardPage } from "../shared/gate.js";
import published from "../../../content/gio/published.json";

/**
 * Pensamientos — en løbende strøm af refleksioner, nyeste øverst.
 *
 * Siden viser KUN content/gio/published.json — køen ligger i
 * content/gio/queue.json, som intet her importerer, så den bundtes
 * aldrig og kan aldrig hentes over HTTP. En upubliceret tekst er
 * simpelthen ikke i buildet; det er hele designet, ingen kryptering.
 *
 * Arbejdsgangen er nu manuel med vilje: han skriver dagens tanke på
 * engelsk i en Claude-session, som lægger den ind i published.json med
 * publiceringsdatoen og deployer. Ingen læst/ulæst-tilstand, ingen
 * dagslås — hun skal kunne dykke ned i strømmen når som helst.
 *
 * Rammen er spansk (hendes sprog); selve indlæggene er engelske og
 * bærer lang="en". Datoen vises uden årstal: "10 sep".
 */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Afsnit på tomme linjer, linjeskift indenfor et afsnit bevares. */
function bodyHtml(body) {
  return String(body)
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

/* Publiceringsdato uden årstal, på spansk: "10 sep" */
const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function prettyDate(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ES[m - 1]}`;
}

const entries = [...published.entries].sort((a, b) => (a.date < b.date ? 1 : -1));

const feed = document.getElementById("feed");

if (entries.length === 0) {
  feed.innerHTML = `<p class="text-center text-sm leading-relaxed text-text-muted">Aún no hay pensamientos — el primero llega pronto.</p>`;
} else {
  feed.innerHTML = entries
    .map(
      (entry) => `
    <article class="flex flex-col gap-3 rounded-card border border-border-faint bg-card-bg px-6 py-6 backdrop-blur-[2px]">
      <p class="flex items-center gap-2 text-xs tracking-loose text-text-dim">
        <span class="text-accent" aria-hidden="true">♥</span>${escapeHtml(prettyDate(entry.date))}
      </p>
      <div lang="en" class="flex flex-col gap-3 text-base leading-relaxed text-ink">${bodyHtml(entry.body)}</div>
    </article>`,
    )
    .join("");
}

guardPage();
