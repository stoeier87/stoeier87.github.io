import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { globSync } from "glob";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GAMES } from "./src/arcade/shared/games-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Site source lives in src/, which is the Vite root. Everything below resolves
// against SRC, not the repo root — the config file stays at the repo root, so
// `__dirname` alone is one level too high and would silently glob nothing.
// `root` is also what preserves every URL: Vite emits each HTML file at its path
// relative to `root`, so src/arcade/comet-pong/index.html still ships as
// /arcade/comet-pong/. Renaming Rollup input keys does NOT do this.
const SRC = path.resolve(__dirname, "src");

// Vite's dev server only resolves `/foo/` or `/foo.html` to a file, never
// `/foo` -> `/foo/index.html`. Without this, requests like /arcade/iss-docking
// (no trailing slash) silently fall through to the SPA fallback and serve the
// homepage instead of 404-ing or redirecting, the way a static host would.
function directoryIndexRedirect() {
  return {
    name: "directory-index-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const [pathname, search = ""] = req.url.split("?");
        if (pathname.endsWith("/") || path.extname(pathname)) return next();
        const indexPath = path.join(SRC, pathname, "index.html");
        if (fs.existsSync(indexPath)) {
          res.statusCode = 302;
          res.setHeader("Location", pathname + "/" + (search ? `?${search}` : ""));
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// Routing is the filesystem: every HTML file under src/ becomes a Rollup entry.
// `cwd: SRC` is mandatory — globSync resolves against process.cwd(), NOT against
// Vite's `root`, so without it this globs the repo root and finds zero pages
// while reporting no error at all.
// `dist/**` MUST stay ignored — otherwise a previous build's output is fed back
// in as input (12 extra entries), and a stale dist/ built with a different `base`
// fails the build outright with "Failed to resolve /assets/…". CI never hit this
// because CI always checks out fresh.
// Computed once and shared with sitemapPlugin() below, so the sitemap can never
// drift from the actual route table the way a hand-maintained list would.
const HTML_FILES = globSync("**/*.html", { cwd: SRC, ignore: ["node_modules/**", "dist/**"] });

function getInputs() {
  const inputs = {};
  HTML_FILES.forEach((file) => {
    const name = file.replace(/\.html$/, "");
    inputs[name] = path.resolve(SRC, file);
  });
  return inputs;
}

// See docs/CLAUDE.md's Versioning section: package.json's version is bumped
// automatically by CI, never by hand. This just surfaces whatever's there.
const APP_VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8")).version;

const SITE_URL = "https://stoeier.dk";

// sitemap.xml, generated from the same HTML_FILES the build already globbed —
// add a page under src/ and it appears here on the next build, no second list
// to remember. /scoreboard/ is excluded: it's a live Firebase leaderboard with
// no unique static content, not a page worth indexing. The route strings below
// are sitemap <loc> entries, which the spec requires to be absolute against the
// production host — not page-relative links, so root-absolute is correct here.
function sitemapPlugin() {
  return {
    name: "sitemap",
    generateBundle() {
      const routes = HTML_FILES.map((file) => {
        const dir = path.dirname(file);
        return dir === "." ? "/" : "/" + dir + "/"; // guard:allow-absolute
      })
        .filter((route) => route !== "/scoreboard/") // guard:allow-absolute
        // hall-of-stars is live Firebase data like the scoreboard — same reasoning
        .filter((route) => route !== "/scoreboard/hall-of-stars/") // guard:allow-absolute
        // /gio and everything under it is private (noindex on every page,
        // no robots.txt rule on purpose — crawlers must be able to READ the
        // noindex tag, so the pages stay out of the sitemap instead)
        .filter((route) => !route.startsWith("/gio/")) // guard:allow-absolute
        // the comet-pong stub is a redirect, not a page worth indexing
        .filter((route) => route !== "/arcade/comet-pong/") // guard:allow-absolute
        .sort();
      const urls = routes.map((route) => `  <url><loc>${SITE_URL}${route}</loc></url>`).join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: xml });
    },
  };
}

// Bliver gtag/GTM nogensinde koblet til (pluginnet er død kode i dag),
// skal /gio/** eksplicit undtages — det er et privat hjørne, og der må
// aldrig ligge tracking bag lågen.
const GTAG_ID = "G-9M0GB4HHY0";

function gtagPlugin() {
  return {

  };
}

// The 24 tool subpages under src/tools/<slug>/ carry a byte-identical block of
// description/canonical/OG/twitter meta plus a JSON-LD script, differing only
// in title, description and path (docs/CLAUDE.md's dedupe sweep, cluster #2).
// Each source page keeps a single <meta name="st:tool-head"> marker; this
// expands it at build/dev time via transformIndexHtml, so there's zero
// runtime cost and nothing extra ships to the browser. <title> stays literal
// in each page (read back out here) rather than duplicated into the marker.
function toolPageHeadPlugin() {
  const TITLE_RE = /<title>([^<]*)<\/title>/;
  const MARKER_RE = /<meta\s+name="st:tool-head"\s+description="([^"]*)"\s+path="([^"]*)"\s*\/>/;

  return {
    name: "tool-page-head",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const marker = html.match(MARKER_RE);
        if (!marker) return html;
        const [full, description, urlPath] = marker;
        const title = (html.match(TITLE_RE) || [, ""])[1];
        const url = SITE_URL + urlPath;

        const metaBlock = `<meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="servicedesign.dk" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />`;

        const jsonLd = `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url,
          author: { "@type": "Person", name: "Tobias Fullerton Støier", url: `${SITE_URL}/` },
        })}</script>`;

        return html.replace(full, metaBlock).replace("  </head>", `    ${jsonLd}\n  </head>`);
      },
    },
  };
}

// The two font preconnects were byte-identical across all 37 pages (13
// non-tools pages plus the 24 tools/ pages toolPageHeadPlugin doesn't touch)
// and hand-copied everywhere, so a fix like adding a font preload hint meant
// editing 37 files. This is the general version of toolPageHeadPlugin's
// trick: one marker, one source file, expanded at build/dev time via
// transformIndexHtml — zero runtime cost, nothing extra ships to the
// browser. Edit src/shared/common-head.partial and every page picks it up
// on the next build/dev reload. `.partial`, not `.html` — HTML_FILES globs
// `**/*.html` into real page inputs, and this fragment (no <html>/<body>)
// is not a page.
const COMMON_HEAD_SRC = path.resolve(SRC, "shared/common-head.partial");
function commonHeadPlugin() {
  const MARKER = "<meta name=\"st:common-head\" />";
  return {
    name: "common-head",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes(MARKER)) return html;
        const snippet = fs.readFileSync(COMMON_HEAD_SRC, "utf8").trim();
        return html.replace(MARKER, snippet);
      },
    },
  };
}

// The icon CSS + tailwind.css pair was the same second half of every page's
// stylesheet trio (rule 4: page CSS -> icon CSS -> tailwind.css last) across
// all 39 pages, differing only in the ../ depth needed to reach src/. This
// marker goes right after each page's own <link>, and the relative prefix is
// computed from ctx.filename (not hand-maintained) so a page moving depth
// can't silently end up with a wrong path the way the hand-copied lines
// could. Same transformIndexHtml trick as commonHeadPlugin/toolPageHeadPlugin.
function commonFootPlugin() {
  const MARKER = "<meta name=\"st:common-foot\" />";
  return {
    name: "common-foot",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!html.includes(MARKER)) return html;
        const rel = path.relative(SRC, ctx.filename);
        const depth = rel.split(path.sep).length - 1; // -1: the file itself isn't a directory level
        const prefix = depth > 0 ? "../".repeat(depth) : "./";
        const snippet = `<link href="${prefix}css/all.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="${prefix}tailwind.css" />`;
        return html.replace(MARKER, snippet);
      },
    },
  };
}

// The 9 arcade game pages had no description/OG/twitter meta at all. Rather
// than hand-write it 9 times (or hardcode it into this plugin), the copy
// comes from GAMES (src/arcade/shared/games-data.js) -- the same module
// arcade.js renders the card grid from and scoreboard.js reads its board
// list from. A plain data module with no browser APIs, so importing it here
// at config-eval time is safe, same as this file already reads
// package.json. The slug and the page's own url are both derived from
// ctx.filename, same as commonFootPlugin, so nothing here is hand-maintained
// per page. <title> stays literal in each page and is read back out,
// exactly like toolPageHeadPlugin.
function arcadeGameHeadPlugin() {
  const MARKER = "<meta name=\"st:game-head\" />";
  const TITLE_RE = /<title>([^<]*)<\/title>/;

  return {
    name: "arcade-game-head",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!html.includes(MARKER)) return html;
        const rel = path.relative(SRC, ctx.filename);
        const slug = rel.split(path.sep)[1]; // arcade/<slug>/index.html
        const game = GAMES.find((g) => g.key === slug);
        if (!game) {
          throw new Error(`arcadeGameHeadPlugin: no GAMES entry for "${slug}"`);
        }
        const description = game.tagline;
        const title = (html.match(TITLE_RE) || [, ""])[1];
        const url = `${SITE_URL}/arcade/${slug}/`;

        const metaBlock = `<meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="stoeier.dk" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />`;

        return html.replace(MARKER, metaBlock);
      },
    },
  };
}

export default defineConfig({
  // The route table. publicDir defaults to <root>/public, which is why src/public/
  // needs no config line of its own — moving it out of src/ would silently 404
  // every Font Awesome icon while the rest of the site looked fine.
  root: "src",
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [tailwindcss(), directoryIndexRedirect(), sitemapPlugin(), toolPageHeadPlugin(), commonHeadPlugin(), commonFootPlugin(), arcadeGameHeadPlugin()
    // , gtagPlugin()
  ],
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  optimizeDeps: {
    include: ["@shared/elements/page-header.ts", "@shared/elements/hall-nav.ts", "@shared/elements/footer.ts"],
  },
  server: {
    port: 3000,
  },
  build: {
    // Relative to `root`, so a bare "dist" would write src/dist/. emptyOutDir is
    // required because the target now sits outside the root.
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getInputs(),
    },
  },
});
