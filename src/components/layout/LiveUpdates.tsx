"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { celebrateWin } from "@/lib/celebrate";
import { classLabel } from "@/lib/cards/class-colors";
import type { LiveEvent } from "@/lib/live/events";
import { t } from "@/i18n";

/** Lets the refreshed page render before the win flare looks for the win-rate figure. */
const CELEBRATE_AFTER_MS = 700;

/**
 * Listens to GET /api/events. When games change, the page refreshes itself
 * (new cards get the brass highlight, a win gets the celebration) and a toast
 * says what arrived; when a game starts or ends, the page refreshes so the
 * effects level follows. EventSource reconnects quietly on its own.
 */
export function LiveUpdates() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/events");
    let celebrate: ReturnType<typeof setTimeout> | undefined;

    const onGames = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as Extract<LiveEvent, { type: "games:changed" }>;
      router.refresh();
      const [first] = event.added;
      if (event.added.length === 1 && first) {
        toast.success(t.live.newGame(t.overview.result[first.result], classLabel(first.opponentClass)));
      } else if (event.added.length > 1) {
        toast.success(t.live.newGames(event.added.length));
      }
      if (event.added.some((g) => g.result === "WIN")) celebrate = setTimeout(celebrateWin, CELEBRATE_AFTER_MS);
    };
    const onLive = () => router.refresh();

    source.addEventListener("games:changed", onGames);
    source.addEventListener("live:changed", onLive);
    return () => {
      clearTimeout(celebrate);
      source.close();
    };
  }, [router]);

  return null;
}
