import { defineConfig } from "vite";
import { globSync } from "glob";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getInputs() {
  const files = globSync("**/*.html", { ignore: "node_modules/**" });
  const inputs = {};
  files.forEach((file) => {
    const name = file.replace(/\.html$/, "");
    inputs[name] = path.resolve(__dirname, file);
  });
  return inputs;
}

export default defineConfig({
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
