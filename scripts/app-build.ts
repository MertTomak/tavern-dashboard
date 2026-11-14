/**
 * npm run app:build: builds Tavern Dashboard.app and copies it to /Applications.
 *
 * 1. Next.js standalone build, assembled into dist-app/server/ with its static
 *    files, public/, the migrations and the server entry.
 * 2. Checks better-sqlite3's prebuilt Node-API binary came along (it runs in Electron as is).
 * 3. electron-builder makes the .app (no signing, no notarisation; personal use),
 *    then it is signed "ad hoc" so Apple Silicon Macs agree to start it.
 * 4. Copied to /Applications, replacing an older Tavern Dashboard.app.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist-app");
const SERVER = path.join(OUT, "server");
const APP_NAME = "Tavern Dashboard.app";
const INSTALLED = path.join("/Applications", APP_NAME);
const BUNDLE_ID = "local.tavern-dashboard";

const run = (cmd: string, args: string[], cwd = ROOT) => execFileSync(cmd, args, { cwd, stdio: "inherit" });
const step = (msg: string) => console.log(`\n▶ ${msg}`);

step("Building the dashboard (next build)");
run("npx", ["next", "build"]);

step("Assembling the server");
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, ".next/standalone"), SERVER, { recursive: true });
fs.cpSync(path.join(ROOT, ".next/static"), path.join(SERVER, ".next/static"), { recursive: true });
fs.cpSync(path.join(ROOT, "public"), path.join(SERVER, "public"), { recursive: true });
fs.cpSync(path.join(ROOT, "drizzle"), path.join(SERVER, "drizzle"), { recursive: true });
// Turbopack links external packages from .next/node_modules with absolute paths into
// .next/standalone; point them inside the server folder so the app works anywhere.
const linkDir = path.join(SERVER, ".next/node_modules");
const standaloneModules = path.join(ROOT, ".next/standalone/node_modules");
for (const name of fs.existsSync(linkDir) ? fs.readdirSync(linkDir) : []) {
  const link = path.join(linkDir, name);
  if (!fs.lstatSync(link).isSymbolicLink()) continue;
  const target = fs.readlinkSync(link);
  if (!path.isAbsolute(target)) continue;
  const inServer = path.join(SERVER, "node_modules", path.relative(standaloneModules, target));
  fs.rmSync(link);
  fs.symlinkSync(path.relative(path.dirname(link), inServer), link);
}

step("Bundling the app code (esbuild)");
run("npx", ["tsx", "scripts/build-electron.ts"]);
fs.copyFileSync(path.join(ROOT, "dist-electron/server-entry.cjs"), path.join(SERVER, "server-entry.cjs"));

// better-sqlite3 ships prebuilt Node-API binaries (prebuilds/), which Electron's Node loads as they are.
if (!fs.existsSync(path.join(SERVER, "node_modules/better-sqlite3/prebuilds", `${process.platform}-${process.arch}.node`))) {
  throw new Error("better-sqlite3's prebuilt binary is missing from the standalone build.");
}

step("Packaging the app (electron-builder)");
run("npx", ["electron-builder", "--mac", "dir", `--${process.arch}`, "--publish", "never"]);
const built = fs
  .readdirSync(path.join(OUT, "release"))
  .map((d) => path.join(OUT, "release", d, APP_NAME))
  .find((p) => fs.existsSync(p));
if (!built) throw new Error("electron-builder did not produce the app.");

// electron-builder leaves node_modules out of extraResources; the server needs its own.
fs.cpSync(path.join(SERVER, "node_modules"), path.join(built, "Contents/Resources/server/node_modules"), { recursive: true, verbatimSymlinks: true });

step("Signing ad hoc (no Apple account involved)");
run("codesign", ["--force", "--deep", "--sign", "-", built]);

step(`Copying to ${INSTALLED}`);
if (fs.existsSync(INSTALLED)) {
  const id = execFileSync("defaults", ["read", path.join(INSTALLED, "Contents/Info"), "CFBundleIdentifier"]).toString().trim();
  if (id !== BUNDLE_ID) throw new Error(`${INSTALLED} exists but is not ours (${id}); not replacing it.`);
  // Quit the running copy first (asking a closed app to quit would start it).
  const running = (() => {
    try {
      execFileSync("pgrep", ["-f", `${INSTALLED}/Contents/MacOS/`]);
      return true;
    } catch {
      return false;
    }
  })();
  if (running) execFileSync("osascript", ["-e", `tell application id "${BUNDLE_ID}" to quit`]);
  for (let i = 0; running && i < 20; i++) {
    try {
      execFileSync("pgrep", ["-f", `${INSTALLED}/Contents/MacOS/`]);
      execFileSync("sleep", ["0.5"]);
    } catch {
      break;
    }
  }
  fs.rmSync(INSTALLED, { recursive: true, force: true });
}
run("ditto", [built, INSTALLED]);
console.log(`\n✓ Installed ${INSTALLED}`);
