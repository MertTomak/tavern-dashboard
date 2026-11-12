"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardPreview } from "@/components/cards/CardPreview";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "./ArtCrop";
import { TiltCard } from "./TiltCard";
import type { DeckStanding } from "./types";

const CARD_W = 160;

/**
 * A deck as a card. The win-rate gem, name and record stack in the card's
 * left part, which stays visible however tightly the fan overlaps (`visible` px).
 */
function DeckCardFace({ deck, visible = CARD_W }: { deck: DeckStanding; visible?: number }) {
  const good = deck.rate >= 0.5;
  return (
    <div className="brass-frame relative aspect-[5/7] w-full overflow-hidden rounded-[14px] [--frame-fill:#1c1410]">
      <div className="absolute inset-[5px] overflow-hidden rounded-[10px]">
        <ArtCrop cardId={deck.art} alt={deck.cardName ?? deck.name} focus="face" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#1c1410f5_0%,#1c1410e6_42%,transparent_78%)]" />
      </div>
      <div className="absolute top-2 left-2 grid gap-1.5" style={{ width: Math.max(72, Math.min(CARD_W, visible) - 14) }}>
        <span
          className={cn(
            "stat flex size-11 items-center justify-center rounded-full text-sm font-bold text-oak ring-2 ring-brass-light shadow-[0_4px_10px_rgba(0,0,0,0.6)]",
            good ? "bg-[radial-gradient(circle_at_35%_30%,#d9fff4,var(--win))]" : "bg-[radial-gradient(circle_at_35%_30%,#ffe0d2,var(--loss))]",
          )}
        >
          {formatPercent(deck.rate).replace(".0%", "%")}
        </span>
        <p className="font-display text-[15px] leading-tight font-semibold text-brass-light [overflow-wrap:anywhere] [text-shadow:0_1px_6px_#000]">{deck.name}</p>
        <p className="stat text-xs text-brass-light/85 [text-shadow:0_1px_4px_#000]">
          {formatNumber(deck.wins)}–{formatNumber(deck.losses)} · {t.overview.n(formatNumber(deck.n))}
        </p>
      </div>
    </div>
  );
}

function withPreview(deck: DeckStanding, node: React.ReactElement) {
  return deck.cardName ? (
    <CardPreview cardId={deck.art} name={deck.cardName}>
      {node}
    </CardPreview>
  ) : (
    node
  );
}

/** Spread between cards: as wide as the panel allows, overlapping only when space runs out. */
function useSpread(count: number) {
  const ref = useRef<HTMLOListElement>(null);
  const [step, setStep] = useState(CARD_W * 0.75);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width - 24;
      const ideal = count > 1 ? (w - CARD_W) / (count - 1) : 0;
      setStep(Math.max(64, Math.min(CARD_W + 14, ideal)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);
  return { ref, step };
}

/** Decks fanned like a hand: the fan opens on first paint; the hovered card lifts clear of the others. */
export function DeckHand({ decks }: { decks: DeckStanding[] }) {
  const mid = (decks.length - 1) / 2;
  const { ref, step } = useSpread(decks.length);
  const overlap = step < CARD_W;
  const [focused, setFocused] = useState<number | null>(null);
  return (
    <>
      <ol ref={ref} aria-label={t.concepts.hand} className="relative hidden h-[290px] w-full sm:block">
        {decks.map((d, i) => {
          const off = i - mid;
          const lifted = focused === i;
          return (
            <motion.li
              key={d.name}
              className="absolute bottom-6 left-1/2 origin-[50%_130%]"
              style={{ width: CARD_W, marginLeft: -CARD_W / 2 }}
              initial={{ rotate: 0, x: 0, y: 40, opacity: 0 }}
              animate={
                lifted
                  ? { rotate: 0, x: off * step, y: -34, scale: 1.06, opacity: 1, zIndex: 60 }
                  : { rotate: off * (overlap ? 4 : 3), x: off * step, y: Math.abs(off) * Math.abs(off) * (overlap ? 5 : 6), scale: 1, opacity: 1, zIndex: 10 + i }
              }
              whileHover={{ y: -34, rotate: 0, scale: 1.06, zIndex: 60 }}
              onFocusCapture={() => setFocused(i)}
              onBlurCapture={() => setFocused(null)}
              transition={{ type: "spring", bounce: 0.12, visualDuration: 0.35 }}
            >
              <TiltCard className={cn("rounded-[14px]", d.lowSample && "grayscale-[0.6] brightness-75")} lift={0} max={8}>
                {withPreview(
                  d,
                  <div
                    tabIndex={0}
                    aria-label={`${d.name}, ${formatPercent(d.rate)}, ${t.overview.n(formatNumber(d.n))}`}
                    className="rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <DeckCardFace deck={d} visible={i === decks.length - 1 || lifted ? CARD_W : step} />
                  </div>,
                )}
              </TiltCard>
            </motion.li>
          );
        })}
      </ol>
      <ol aria-label={t.concepts.hand} className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:hidden">
        {decks.map((d) => (
          <li key={d.name} className={cn("w-[150px] shrink-0 snap-start", d.lowSample && "grayscale-[0.6] brightness-75")}>
            <DeckCardFace deck={d} />
          </li>
        ))}
      </ol>
    </>
  );
}
