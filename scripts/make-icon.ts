/**
 * Renders assets/app-icon/icon.svg into the macOS app icon (icon.icns) and tray.svg into
 * the menu bar icon (trayTemplate.png)
 * with tools that ship with the Mac (Chrome for the SVG, sips + iconutil for the .icns).
 * Run after changing the SVG: npx tsx scripts/make-icon.ts
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = path.resolve("assets/app-icon");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tavern-icon-"));
const png = path.join(dir, "icon.png");

/** Renders an SVG to a transparent PNG at `size` × `size` pixels. */
function render(svg: string, out: string, size: number) {
  const html = path.join(tmp, `${path.basename(out)}.html`);
  const markup = fs.readFileSync(path.join(dir, svg), "utf8").replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
  fs.writeFileSync(html, `<html style="background:transparent"><body style="margin:0;background:transparent">${markup}</body></html>`);
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000", `--window-size=${size},${size}`, `--screenshot=${out}`, `file://${html}`], { stdio: "ignore" });
}

render("icon.svg", png, 1024);
// Menu bar icon: "Template" in the name lets macOS tint it for light and dark menu bars.
render("tray.svg", path.join(dir, "trayTemplate.png"), 16);
render("tray.svg", path.join(dir, "trayTemplate@2x.png"), 32);

const iconset = path.join(tmp, "icon.iconset");
fs.mkdirSync(iconset);
for (const size of [16, 32, 128, 256, 512]) {
  execFileSync("sips", ["-z", String(size), String(size), png, "--out", path.join(iconset, `icon_${size}x${size}.png`)], { stdio: "ignore" });
  execFileSync("sips", ["-z", String(size * 2), String(size * 2), png, "--out", path.join(iconset, `icon_${size}x${size}@2x.png`)], { stdio: "ignore" });
}
execFileSync("iconutil", ["-c", "icns", iconset, "-o", path.join(dir, "icon.icns")]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${path.join(dir, "icon.icns")}`);
