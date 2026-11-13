/**
 * Imported first by main.ts: settles where the app keeps its data before any
 * shared module (src/lib/paths.ts) reads the environment.
 */
import os from "node:os";
import path from "node:path";
import { app } from "electron";

app.setName("Tavern Dashboard");
const support = path.join(os.homedir(), "Library", "Application Support", "TavernDashboard");
app.setPath("userData", path.join(support, "electron"));

// The built app keeps everything in Application Support; `npm run app:dev` uses the project's data/.
if (app.isPackaged && !process.env.TAVERN_DATA_DIR) process.env.TAVERN_DATA_DIR = support;
