/**
 * publish-next.js — flytter én dagbogsbesked fra køen til det publicerede.
 *
 *   node scripts/publish-next.js            publicér næste besked (én pr. dag)
 *   node scripts/publish-next.js --force    publicér selv om der allerede er
 *                                           publiceret i dag
 *
 * Læser content/gio/queue.json, tager den FORRESTE besked, sætter dens dato
 * til i dag (København) hvis den ingen har — en eksplicit dato røres ikke —
 * og flytter den over i content/gio/published.json. Begge filer skrives
 * tilbage med 2-mellemrums-indrykning og afsluttende linjeskift, så diffs
 * forbliver læsbare.
 *
 * Kørt to gange samme dag publicerer den IKKE to beskeder: published.json's
 * lastRun husker seneste kørselsdato, og en gentagelse afvises stille (exit
 * 0, så et planlagt job ikke melder fejl) medmindre --force gives. En tom kø
 * er heller ikke en fejl: klar besked, ingen ændringer, exit 0.
 *
 * Køen bundtes aldrig: dagbogssiden importerer kun published.json, og
 * content/ ligger uden for src/ (Vites root), så queue.json hverken kopieres
 * til dist/ eller kan hentes over HTTP. En upubliceret besked findes
 * simpelthen ikke i buildet.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLISHED = path.join(here, "..", "content", "gio", "published.json");
const QUEUE = path.join(here, "..", "content", "gio", "queue.json");

const force = process.argv.includes("--force");

/* Dagens dato i København — samme tidszone-disciplin som resten af sitet.
   en-CA formaterer som YYYY-MM-DD direkte. */
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

const published = readJson(PUBLISHED);
const queue = readJson(QUEUE);

if (published.lastRun === today && !force) {
  console.log(
    `publish-next: der er allerede publiceret i dag (${today}) — ingen ændringer. ` +
      "Kør med --force hvis det er med vilje.",
  );
  process.exit(0);
}

if (!Array.isArray(queue.entries) || queue.entries.length === 0) {
  console.log("publish-next: køen er tom — ingen ændringer.");
  process.exit(0);
}

const entry = queue.entries.shift();
if (!entry.date) {
  entry.date = today;
}

published.entries.push(entry);
published.lastRun = today;

writeJson(PUBLISHED, published);
writeJson(QUEUE, queue);

const preview = String(entry.body).split("\n")[0].slice(0, 60);
console.log(
  `publish-next: publicerede beskeden dateret ${entry.date} ("${preview}…"). ` +
    `${queue.entries.length} tilbage i køen.`,
);
