/** Imported first by main.ts: sets the app's name and where Electron keeps its files. */
import os from "node:os";
import path from "node:path";
import { app } from "electron";

app.setName("Tavern Dashboard");
// Electron's own files (caches, app-state.json) sit in a subfolder of the app's data folder.
app.setPath("userData", path.join(os.homedir(), "Library", "Application Support", "TavernDashboard", "electron"));
