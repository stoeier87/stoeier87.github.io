import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { globSync } from "glob";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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
        // the comet-pong stub is a redirect, not a page worth indexing
        .filter((route) => route !== "/arcade/comet-pong/") // guard:allow-absolute
        .sort();
      const urls = routes.map((route) => `  <url><loc>${SITE_URL}${route}</loc></url>`).join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: xml });
    },
  };
}

const GTAG_ID = "G-9M0GB4HHY0";

function gtagPlugin() {
  return {

  };
}

export default defineConfig({
  // The route table. publicDir defaults to <root>/public, which is why src/public/
  // needs no config line of its own — moving it out of src/ would silently 404
  // every Font Awesome icon while the rest of the site looked fine.
  root: "src",
  base: "./",
  plugins: [tailwindcss(), directoryIndexRedirect(), sitemapPlugin()
    // , gtagPlugin()
  ],
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
