/** Imported first by main.ts: sets the app's name and where Electron keeps its files. */
import os from "node:os";
import path from "node:path";
import { app } from "electron";

app.setName("Tavern Dashboard");
// Electron's own files (caches, app-state.json) sit in a subfolder of the app's data folder.
// With TAVERN_DATA_DIR (tests) they move too, so a test run never shares window places or the single-instance lock with the real app.
app.setPath("userData", path.join(process.env.TAVERN_DATA_DIR ?? path.join(os.homedir(), "Library", "Application Support", "TavernDashboard"), "electron"));
