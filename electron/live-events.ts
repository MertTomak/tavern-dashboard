import { z } from "zod";

/**
 * Listens to the dashboard server's event stream (GET /api/events, the same one
 * open pages use) from the main process, reconnecting if it drops.
 */
const eventSchema = z.object({ type: z.string() }).passthrough();
export type ServerEvent = z.infer<typeof eventSchema>;

export function listenToServer(url: string, onEvent: (event: ServerEvent) => void): () => void {
  let stopped = false;
  let controller: AbortController | null = null;

  const run = async () => {
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await fetch(`${url}/api/events`, { signal: controller.signal });
        if (!res.body) throw new Error("No event stream");
        const decoder = new TextDecoder();
        let buffer = "";
        const reader = res.body.getReader();
        for (let r = await reader.read(); !r.done; r = await reader.read()) {
          buffer += decoder.decode(r.value, { stream: true });
          let end: number;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = block.split("\n").find((l) => l.startsWith("data: "));
            if (!data) continue;
            const parsed = eventSchema.safeParse(JSON.parse(data.slice(6)));
            if (parsed.success) onEvent(parsed.data);
          }
        }
      } catch {
        // Server restarting or gone for a moment; try again shortly.
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 3000));
    }
  };
  void run();
  return () => {
    stopped = true;
    controller?.abort();
  };
}
