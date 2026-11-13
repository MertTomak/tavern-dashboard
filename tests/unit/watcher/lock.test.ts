import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lockHolder, tryAcquireWatcherLock } from "@/lib/watcher/lock";

let dir: string;
let file: string;
const holder = (pid: number, beat: number) => fs.writeFileSync(file, JSON.stringify({ pid, owner: "other", since: "2026-11-14T00:00:00.000Z", beat }));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "tavern-lock-"));
  file = path.join(dir, "watcher.lock");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("watcher lock", () => {
  it("takes a free lock and frees it again", () => {
    const got = tryAcquireWatcherLock("test", file);
    expect("lock" in got).toBe(true);
    expect(lockHolder(file)?.pid).toBe(process.pid);
    if ("lock" in got) got.lock.release();
    expect(fs.existsSync(file)).toBe(false);
  });

  it("refuses while another live process holds it", () => {
    holder(process.ppid, Date.now());
    const got = tryAcquireWatcherLock("test", file);
    expect("heldBy" in got && got.heldBy.owner).toBe("other");
  });

  it("takes over from a process that is gone", () => {
    holder(2 ** 22 + 12345, Date.now());
    expect("lock" in tryAcquireWatcherLock("test", file)).toBe(true);
  });

  it("takes over when the holder stopped refreshing", () => {
    holder(process.ppid, Date.now() - 60_000);
    expect("lock" in tryAcquireWatcherLock("test", file)).toBe(true);
  });
});
