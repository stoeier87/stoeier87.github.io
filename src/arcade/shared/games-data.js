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
 * - introTitle: the pre-game briefing card's title (<st-game-intro
 *   game-title>). Only set where it doesn't match gameLabel.toUpperCase()
 *   — every game but earth's "MATCH & DOCK" (a snappy verb phrase, not the
 *   game's proper name) uses the derived default.
 * - introBody: the briefing card's one-line pitch. Same voice/length bar
 *   as `tagline` but not the same text — the card gets more room to be
 *   specific about the goal or hazard than the arcade lobby's card does.
 * - introKeys: { kb, touch }, each an array of [keys, action] pairs
 *   rendered into the briefing card's key-hint lists by <st-game-intro>'s
 *   renderIntroKeys() helper.
 */
export const GAMES = [
  {
    key: "mercury", label: "Merkur", gamekey: "orbit-runner", gameLabel: "Orbit Runner",
    tagline: "Dodge debris, bend gravity, fire beam.",
    introBody: "Debris falls under Mercury's pull. Dodge what you can, burn what you can't.",
    introKeys: {
      kb: [["Mouse / drag", "move"], ["Space", "fire beam"]],
      touch: [["Drag", "move"], ["Tap", "fire beam"]],
    },
  },
  {
    key: "venus", label: "Venus", gamekey: "meteor-dodge", gameLabel: "Meteor Dodge",
    tagline: "Weave through a burning meteor shower.",
    introBody: "Rock, ice, and metal all fall the same way — fast. Move to live, fire to clear a path.",
    introKeys: {
      kb: [["Arrows / WASD", "move"], ["Space", "fire"]],
      touch: [["D-pad", "move"], ["⚡ button", "fire"]],
    },
  },
  {
    key: "earth", label: "Jorden", gamekey: "iss-docking", gameLabel: "ISS Docking",
    tagline: "Match rotation and dock with the station.",
    introTitle: "MATCH & DOCK",
    introBody: "Four thrusters, one shot at a gentle dock. Debris drifts through the corridor, and the station's solar wings sweep past on a timer — watch your gap.",
    introKeys: {
      kb: [["W A S D / Arrows", "thrust N S W E"], ["Two at once, e.g. W + D", "diagonal — NE"]],
      touch: [["Tap a zone", "thrust"], ["Two zones at once", "diagonal thrust"]],
    },
  },
  {
    key: "mars", label: "Mars", gamekey: "phobos-lander", gameLabel: "Phobos Lander",
    tagline: "Land softly on Phobos with limited fuel.",
    introBody: "Fuel is limited. Land gently, or don't land at all.",
    introKeys: {
      kb: [["Space / W / ↑", "thrust"], ["A / ←", "rotate left"], ["D / →", "rotate right"]],
      touch: [["THRUST", "thrust"], ["◀ / ▶", "rotate"]],
    },
  },
  {
    key: "jupiter", label: "Jupiter", gamekey: "galileo", gameLabel: "Galileo",
    tagline: "Map the field. The radiation is patient.",
    introBody: "Map the field. Radiation builds. Three hits and the probe is gone.",
    introKeys: {
      kb: [["Click", "reveal"], ["Right click", "flag"], ["Middle / both buttons", "chord"]],
      touch: [["Tap", "reveal"], ["Long press", "flag"], ["Double tap", "chord"], ["Pinch", "zoom"]],
    },
  },
  {
    key: "saturn", label: "Saturn", gamekey: "star-memory", gameLabel: "Star Memory",
    tagline: "Match constellations around the rings.",
    introBody: "Match the constellations before the clock runs out. Saturn has been keeping time longer than you have.",
    introKeys: {
      kb: [["Click", "turn a card"], ["R", "restart when time is out"]],
      touch: [["Tap", "turn a card"]],
    },
  },
  {
    key: "uranus", label: "Uranus", gamekey: "nebula-trail", gameLabel: "Nebula Trail",
    tagline: "A tilted Snake through an icy nebula.",
    introBody: "Eat pellets to grow — the bigger the trail, the bigger the pellets. Grab the rare comet before it fades!",
    introKeys: {
      kb: [["↑ ↓ ← → / WASD", "steer"]],
      touch: [["Swipe", "steer"]],
    },
  },
  {
    key: "neptune", label: "Neptun", gamekey: "diamond-rain", gameLabel: "Diamond Rain",
    tagline: "Carbon falls and the ice keeps coming down.", cardPlanetLabel: "Neptune",
    introBody: "Carbon falls, the wind splits it, and the ice keeps coming down.",
    introKeys: {
      kb: [["← → / A D", "move"], ["Mouse", "move"], ["Space", "launch"], ["P / Esc", "pause"]],
      touch: [["Drag low on the screen", "move"], ["Tap", "launch"]],
    },
  },
  {
    key: "pluto", label: "Pluto", gamekey: "ice-fall", gameLabel: "Ice Fall",
    tagline: "Stack the ice before it stacks you.",
    introBody: "Stack the ice. Clear the lines. Pluto is patient and you are not.",
    introKeys: {
      kb: [["← →", "move"], ["↓", "soft drop"], ["↑ / X", "rotate"], ["Z", "rotate back"], ["Space", "hard drop"], ["P / Esc", "pause"]],
      touch: [["Swipe", "move"], ["Tap", "rotate"], ["Two-finger tap", "rotate back"], ["Swipe down", "soft drop"], ["Swipe up", "hard drop"]],
    },
  },
];
