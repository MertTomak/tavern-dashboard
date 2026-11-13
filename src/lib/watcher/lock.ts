import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { WATCHER_LOCK_FILE } from "@/lib/paths";

/**
 * Only one process may read the Hearthstone logs at a time (the Mac app or
 * `npm run watch:logs`). The holder writes its pid and a heartbeat into a lock
 * file; a lock whose process is gone or whose heartbeat is old is free.
 */
const holderSchema = z.object({ pid: z.number(), owner: z.string(), since: z.string(), beat: z.number() });
export type LockHolder = z.infer<typeof holderSchema>;

const BEAT_MS = 10_000;
const STALE_MS = 3 * BEAT_MS;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readHolder(file: string): LockHolder | null {
  try {
    return holderSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}

/** The process holding the lock right now, or null when it is free. */
export function lockHolder(file = WATCHER_LOCK_FILE, now = Date.now()): LockHolder | null {
  const holder = readHolder(file);
  if (!holder) return null;
  if (holder.pid === process.pid) return holder;
  return alive(holder.pid) && now - holder.beat < STALE_MS ? holder : null;
}

export type WatcherLock = { release: () => void };

/** Takes the lock, or returns who holds it. The lock refreshes itself until released. */
export function tryAcquireWatcherLock(owner: string, file = WATCHER_LOCK_FILE): { lock: WatcherLock } | { heldBy: LockHolder } {
  const heldBy = lockHolder(file);
  if (heldBy && heldBy.pid !== process.pid) return { heldBy };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const since = new Date().toISOString();
  const write = () => fs.writeFileSync(file, JSON.stringify({ pid: process.pid, owner, since, beat: Date.now() }));
  write();
  const timer = setInterval(() => {
    if (readHolder(file)?.pid === process.pid) write();
  }, BEAT_MS);
  timer.unref();
  return {
    lock: {
      release() {
        clearInterval(timer);
        if (readHolder(file)?.pid === process.pid) fs.rmSync(file, { force: true });
      },
    },
  };
}

/** Waits until the lock is free, then takes it. `onWait` is told once who holds it. */
export async function waitForWatcherLock(owner: string, onWait: (holder: LockHolder) => void, file = WATCHER_LOCK_FILE): Promise<WatcherLock> {
  let told = false;
  for (;;) {
    const got = tryAcquireWatcherLock(owner, file);
    if ("lock" in got) return got.lock;
    if (!told) onWait(got.heldBy);
    told = true;
    await new Promise((r) => setTimeout(r, 5_000));
  }
}
