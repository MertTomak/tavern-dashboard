import { connection } from "next/server";
import { subscribe, type LiveEvent } from "@/lib/live/events";

/** Comment line every so often so proxies and the browser keep the connection open. */
const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events: open pages listen here and refresh when games change
 * (games:changed) or a game starts or ends (live:changed). EventSource
 * reconnects by itself if the connection drops.
 */
export async function GET(req: Request) {
  await connection();
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: LiveEvent) => controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      const unsubscribe = subscribe(send);
      const beat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), HEARTBEAT_MS);
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      cleanup = () => {
        clearInterval(beat);
        unsubscribe();
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
