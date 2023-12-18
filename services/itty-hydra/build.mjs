import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

import envFilePlugin from "esbuild-envfile-plugin";

try {
  await build({
    plugins: [envFilePlugin],
    bundle: true,
    sourcemap: true,
    format: "esm",
    target: "esnext",
    entryPoints: [path.join(__dirname, "index.ts")],
    outdir: path.join(__dirname, "dist"),
    outExtension: { ".js": ".mjs" },
    external: [],
    plugins: [
      NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true,
        global: true
      }),
      NodeModulesPolyfillPlugin({
        util: true
      })
    ]
  });
} catch (e) {
  process.exitCode = 1;
}
