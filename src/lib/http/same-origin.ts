/**
 * Writes are only accepted from this app's own pages or from local scripts
 * (the log watcher sends no Origin header). A web page elsewhere in the
 * browser could otherwise post to localhost.
 */
export function isTrustedRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
