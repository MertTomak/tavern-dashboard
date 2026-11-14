import fs from "node:fs";
import path from "node:path";
import { BACKUPS_DIR, LOG_CONFIG_FILE } from "@/lib/paths";
import { fixLogConfig, logConfigChanges, type LogConfigChange } from "./log-config";

export type LogConfigStatus = { path: string; exists: boolean; changes: LogConfigChange[] };

function read(): string | null {
  try {
    return fs.readFileSync(LOG_CONFIG_FILE, "utf8");
  } catch {
    return null;
  }
}

export function logConfigStatus(): LogConfigStatus {
  const text = read();
  return { path: LOG_CONFIG_FILE, exists: text !== null, changes: logConfigChanges(text) };
}

/**
 * Applies the fix the user approved in Settings. A copy of the old file goes
 * to the app's backups folder first. Takes effect when Hearthstone restarts.
 */
export function applyLogConfigFix(): LogConfigStatus {
  const text = read();
  if (text !== null) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUPS_DIR, `log.config-${new Date().toISOString().replace(/[:.]/g, "-")}`), text);
  }
  fs.mkdirSync(path.dirname(LOG_CONFIG_FILE), { recursive: true });
  fs.writeFileSync(LOG_CONFIG_FILE, fixLogConfig(text));
  return logConfigStatus();
}
