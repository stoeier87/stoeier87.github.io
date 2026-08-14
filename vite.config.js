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
function getInputs() {
  const files = globSync("**/*.html", { cwd: SRC, ignore: ["node_modules/**", "dist/**"] });
  const inputs = {};
  files.forEach((file) => {
    const name = file.replace(/\.html$/, "");
    inputs[name] = path.resolve(SRC, file);
  });
  return inputs;
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
  plugins: [tailwindcss(), directoryIndexRedirect()
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
