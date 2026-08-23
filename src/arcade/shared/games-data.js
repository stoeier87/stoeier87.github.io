/**
 * Single source of truth for the 9 arcade games. Previously three separate
 * hand-copies: scoreboard.js's own GAMES array, arcade/index.html's 9
 * hardcoded .planet-card blocks, and (briefly) a games-data.json read only
 * by vite.config.js's arcadeGameHeadPlugin. All three now read from here —
 * arcade.js renders the card grid from it, scoreboard.js imports it
 * directly, and vite.config.js imports it too (a plain data module, safe to
 * import at config-eval time in Node, same as it already reads package.json).
 *
 * - key: folder slug — matches the route (arcade/<key>/), the card's href,
 *   and the leaderboard/meta URL derived from it in vite.config.js.
 * - label: Danish planet name. Shown as the scoreboard board header, and
 *   lowercased for the card's `data-planet` attribute / .planet CSS class
 *   (arcade.css and FEATURED_SPECS in arcade.js both key off that lowercase
 *   form) — every game's label.toLowerCase() already matched its old
 *   hardcoded data-planet value exactly, so that's derived, not stored.
 * - gamekey: the game's own leaderboard key (arcade/scores/<gamekey>) and
 *   its JS/CSS filename stem.
 * - gameLabel: the game's title — the card's <h2>, and read back into
 *   og:title/twitter:title from each page's own <title> (not from here).
 * - tagline: one-line pitch — shown on the card and reused verbatim as the
 *   page's meta description/og:description/twitter:description.
 * - cardPlanetLabel: only set where the card's <p class="game"> text
 *   doesn't match `label`. Neptune's card already read the English
 *   "Neptune" rather than the Danish "Neptun" before this was centralized —
 *   preserved as-is rather than silently changed; ask before removing it.
 */
export const GAMES = [
  { key: "mercury", label: "Merkur", gamekey: "orbit-runner", gameLabel: "Orbit Runner", tagline: "Dodge debris, bend gravity, fire beam." },
  { key: "venus", label: "Venus", gamekey: "meteor-dodge", gameLabel: "Meteor Dodge", tagline: "Weave through a burning meteor shower." },
  { key: "earth", label: "Jorden", gamekey: "iss-docking", gameLabel: "ISS Docking", tagline: "Match rotation and dock with the station." },
  { key: "mars", label: "Mars", gamekey: "phobos-lander", gameLabel: "Phobos Lander", tagline: "Land softly on Phobos with limited fuel." },
  { key: "jupiter", label: "Jupiter", gamekey: "galileo", gameLabel: "Galileo", tagline: "Map the field. The radiation is patient." },
  { key: "saturn", label: "Saturn", gamekey: "star-memory", gameLabel: "Star Memory", tagline: "Match constellations around the rings." },
  { key: "uranus", label: "Uranus", gamekey: "nebula-trail", gameLabel: "Nebula Trail", tagline: "A tilted Snake through an icy nebula." },
  { key: "neptune", label: "Neptun", gamekey: "diamond-rain", gameLabel: "Diamond Rain", tagline: "Carbon falls and the ice keeps coming down.", cardPlanetLabel: "Neptune" },
  { key: "pluto", label: "Pluto", gamekey: "ice-fall", gameLabel: "Ice Fall", tagline: "Stack the ice before it stacks you." },
];
