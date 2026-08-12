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

// Vite's `base` rewrites bundled asset URLs, but hand-authored absolute-path
// attributes like <a href="/arcade/"> stay as-is and would 404 under a subpath
// deploy (staging at /staging/). Prepend the base to href/src/action values
// that start with a single `/`, skipping protocol-relative URLs and paths
// already under the base.
function rewriteAbsolutePathsPlugin(base) {
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!normalized) return { name: "rewrite-absolute-paths-noop" };
  return {
    name: "rewrite-absolute-paths",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /(\s(?:href|src|action)=")(\/[^\/"][^"]*)"/g,
        (match, prefix, path) => {
          if (path.startsWith(normalized + "/") || path === normalized) return match;
          return `${prefix}${normalized}${path}"`;
        }
      );
    },
  };
}

function getInputs() {
  const files = globSync("**/*.html", { ignore: "node_modules/**" });
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

const DEPLOY_BASE = process.env.DEPLOY_BASE ?? "/";

export default defineConfig({
  base: DEPLOY_BASE,
  plugins: [
    tailwindcss(),
    directoryIndexRedirect(),
    rewriteAbsolutePathsPlugin(DEPLOY_BASE),
    // gtagPlugin(),
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
