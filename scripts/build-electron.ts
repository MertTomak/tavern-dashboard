/**
 * Bundles the Mac app's own code (electron/*.ts plus the shared src/lib modules
 * it uses) into dist-electron/, one CommonJS file per entry.
 */
import { build } from "esbuild";

const common = { bundle: true, platform: "node", target: "node22", format: "cjs", sourcemap: "linked", logLevel: "warning", tsconfig: "tsconfig.json" } as const;

void Promise.all([
  build({ ...common, entryPoints: { main: "electron/main.ts" }, outdir: "dist-electron", outExtension: { ".js": ".cjs" }, external: ["electron"] }),
  // Runs inside the bundled standalone server folder, where better-sqlite3 is installed (built for Electron).
  build({ ...common, entryPoints: { "server-entry": "electron/server-entry.ts" }, outdir: "dist-electron", outExtension: { ".js": ".cjs" }, external: ["better-sqlite3"] }),
]).then(() => console.log("Built dist-electron/"), (err: unknown) => {
  console.error(err);
  process.exit(1);
});
