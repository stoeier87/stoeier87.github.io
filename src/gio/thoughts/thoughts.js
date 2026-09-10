import { guardPage } from "../shared/gate.js";
import { copenhagenParts } from "../../shared/zodiac-periods.js";
import published from "../../../content/gio/published.json";

/* Dagbogen viser KUN content/gio/published.json — køen ligger i
   content/gio/queue.json, som intet her importerer, så den bundtes
   aldrig og kan aldrig hentes over HTTP. En upubliceret besked er
   simpelthen ikke i buildet; det er hele designet, ingen kryptering.
   scripts/publish-next.js flytter én besked om dagen fra kø til
   publiceret. */

const READ_KEY = "gio_read_dates";

function readSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function markRead(date) {
  const set = readSet();
  if (set.has(date)) return;
  set.add(date);
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    /* uden storage vises beskederne stadig — de husker bare ikke læst-status */
  }
  refreshUnread();
}

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

const DA_DATE = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return DA_DATE.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/* Dagens dato i København — samme tidszone-disciplin som resten af
   sitet (zodiac-periods.js), aldrig maskinens lokale klokke. */
const nowCph = copenhagenParts(Date.now());
const todayIso = [
  nowCph.year,
  String(nowCph.month).padStart(2, "0"),
  String(nowCph.day).padStart(2, "0"),
].join("-");

const entries = [...published.entries].sort((a, b) => (a.date < b.date ? 1 : -1));
const todayEntry = entries.find((e) => e.date === todayIso);
const pastEntries = entries.filter((e) => e.date < todayIso);

const el = {
  unread: document.getElementById("unreadCount"),
  today: document.getElementById("today"),
  archive: document.getElementById("archive"),
};

function refreshUnread() {
  const set = readSet();
  const unread = pastEntries.filter((e) => !set.has(e.date));
  el.unread.hidden = unread.length === 0;
  el.unread.textContent = unread.length === 1 ? "1 ulæst" : `${unread.length} ulæste`;
  for (const item of el.archive.querySelectorAll("details")) {
    const isUnread = !set.has(item.dataset.date);
    item.querySelector(".unread-dot").hidden = !isUnread;
    item.querySelector("summary span.date-label").classList.toggle("text-ink", isUnread);
    item.querySelector("summary span.date-label").classList.toggle("text-text-muted", !isUnread);
  }
}

function render() {
  if (todayEntry) {
    el.today.innerHTML = `
      <p class="text-xs tracking-loose text-text-dim">${escapeHtml(prettyDate(todayEntry.date))}</p>
      <div class="flex flex-col gap-4 text-lg leading-relaxed text-ink md:text-xl">${bodyHtml(todayEntry.body)}</div>`;
  } else {
    el.today.innerHTML = `
      <p class="text-base leading-relaxed text-text-muted">Ingen besked i dag. Der kommer en i morgen.</p>`;
  }

  el.archive.innerHTML = pastEntries
    .map(
      (entry) => `
    <details data-date="${entry.date}" class="group rounded-hud border border-border-faint px-4 py-3">
      <summary class="flex cursor-pointer list-none items-center gap-3 text-sm focus-visible:outline-2 focus-visible:outline-accent">
        <span class="unread-dot h-2 w-2 shrink-0 rounded-pill bg-accent" hidden></span>
        <span class="date-label tracking-wide">${escapeHtml(prettyDate(entry.date))}</span>
        <span class="ml-auto text-text-dim transition-transform group-open:rotate-90" aria-hidden="true">›</span>
      </summary>
      <div class="flex flex-col gap-3 pt-3 text-sm leading-relaxed text-text-muted">${bodyHtml(entry.body)}</div>
    </details>`,
    )
    .join("");

  for (const item of el.archive.querySelectorAll("details")) {
    item.addEventListener("toggle", () => {
      if (item.open) markRead(item.dataset.date);
    });
  }
  refreshUnread();
}

render();
guardPage().then(() => {
  /* dagens besked tæller som åbnet i det øjeblik den faktisk er vist —
     dvs. efter lågen, ikke bare fordi siden blev hentet */
  if (todayEntry) markRead(todayEntry.date);
});
