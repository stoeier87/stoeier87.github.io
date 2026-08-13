import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { globSync } from "glob";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        const indexPath = path.join(__dirname, pathname, "index.html");
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

// Routing is the filesystem: every HTML file becomes a Rollup entry.
// `dist/**` MUST be ignored — otherwise a previous build's output is fed back in
// as input (12 extra entries), and a stale dist/ built with a different `base`
// fails the build outright with "Failed to resolve /assets/…". CI never hit this
// because CI always checks out fresh.
function getInputs() {
  const files = globSync("**/*.html", { ignore: ["node_modules/**", "dist/**"] });
  const inputs = {};
  files.forEach((file) => {
    const name = file.replace(/\.html$/, "");
    inputs[name] = path.resolve(__dirname, file);
  });
  return inputs;
}


const GTAG_ID = "G-9M0GB4HHY0";

function gtagPlugin() {
  return {
    
  };
}

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), directoryIndexRedirect()
    // , gtagPlugin()
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: getInputs(),
    },
  },
});
