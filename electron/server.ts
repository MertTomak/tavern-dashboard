import net from "node:net";
import path from "node:path";
import { app, utilityProcess, type UtilityProcess } from "electron";

/**
 * The dashboard is our Next.js app. In development it is the `next dev`
 * server; in the built app it is the standalone server shipped inside the
 * .app, started in a utility process (its own Node, so page rendering never
 * slows down the main process that reads the logs and drives the tracker).
 */
const PREFERRED_PORT = 47110;

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function pickPort(): Promise<number> {
  if (await portFree(PREFERRED_PORT)) return PREFERRED_PORT;
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function waitUntilUp(url: string, timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`The dashboard server did not start (${url}).`);
}

export type DashboardServer = { url: string; stop: () => void };

export async function startServer(dataDir: string): Promise<DashboardServer> {
  const devUrl = process.env.TAVERN_DEV_URL;
  if (devUrl) {
    // `npm run app:dev` starts next dev itself; the first compile can take a while.
    await waitUntilUp(devUrl, 120_000);
    return { url: devUrl, stop: () => undefined };
  }
  const port = await pickPort();
  const dir = path.join(process.resourcesPath, "server");
  const child: UtilityProcess = utilityProcess.fork(path.join(dir, "server-entry.cjs"), [], {
    cwd: dir,
    serviceName: "Tavern Dashboard server",
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", TAVERN_DATA_DIR: dataDir },
  });
  const url = `http://127.0.0.1:${port}`;
  await waitUntilUp(url, 30_000);
  let stopping = false;
  child.once("exit", (code) => {
    if (!stopping) console.error(`Dashboard server stopped unexpectedly (code ${code}).`);
  });
  app.once("will-quit", () => child.kill());
  return {
    url,
    stop: () => {
      stopping = true;
      child.kill();
    },
  };
}
