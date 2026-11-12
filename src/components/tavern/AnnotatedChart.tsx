"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { Crown, Flame, Layers, Shield, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatPercent } from "@/lib/format";
import { LEGEND_INDEX, rankLabel } from "@/lib/stats/rank";
import type { ChartMilestone, ChartPoint } from "./types";

const ICONS: Record<ChartMilestone["kind"], LucideIcon> = {
  league: Shield,
  legend: Crown,
  newDeck: Layers,
  longestStreak: Flame,
};

type Props = {
  points: ChartPoint[];
  milestones: ChartMilestone[];
  kind: "percent" | "rank";
  ariaLabel: string;
  height: number;
  /** Token colour for the series, e.g. "var(--chart-1)". */
  color: string;
  curve?: "monotone" | "stepAfter";
};

function ChartTip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-xs border border-primary/40 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-panel">
      {p.tip.map((line, i) => (
        <div key={i} className={i === 0 ? "stat text-base font-bold" : "text-muted-foreground"}>
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * Trend line with key moments pinned on top as brass coins (new league,
 * Legend, new deck, longest streak). Hover an icon for its label.
 */
export function AnnotatedChart({ points, milestones, kind, ariaLabel, height, color, curve = "monotone" }: Props) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const isPercent = kind === "percent";
  const min = isPercent ? 0 : Math.max(0, Math.floor(Math.min(...points.map((d) => d.y)) / 10) * 10);
  const max = isPercent ? 1 : LEGEND_INDEX;
  const ticks = isPercent ? [0, 0.25, 0.5, 0.75, 1] : Array.from({ length: (max - min) / 10 + 1 }, (_, i) => min + i * 10);

  return (
    <figure className="hs-chart m-0" style={{ ["--series" as string]: color }}>
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 30, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--series)", stopOpacity: 0.32 }} />
                <stop offset="100%" style={{ stopColor: "var(--series)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis
              domain={[min, max]}
              ticks={ticks}
              tickFormatter={(v: number) => (isPercent ? formatPercent(v).replace(".0", "") : rankLabel(v))}
              axisLine={false}
              tickLine={false}
              width={isPercent ? 44 : 100}
            />
            <ReferenceLine y={isPercent ? 0.5 : LEGEND_INDEX} strokeDasharray="4 4" />
            {milestones.map((m) => {
              const Icon = ICONS[m.kind];
              return (
                <ReferenceLine
                  key={`${m.kind}-${m.x}`}
                  x={m.x}
                  stroke="var(--series)"
                  strokeOpacity={0.35}
                  strokeDasharray="2 3"
                  label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                    const x = viewBox?.x ?? 0;
                    const y = (viewBox?.y ?? 0) - 16;
                    return (
                      <g transform={`translate(${x}, ${y})`} className="cursor-help">
                        <title>{m.label}</title>
                        <circle r={12} fill={`url(#${id}-coin)`} stroke="#3a2610" strokeWidth={1} />
                        <circle r={9.5} fill="none" stroke="#f6d896" strokeOpacity={0.6} />
                        <Icon x={-7} y={-7} width={14} height={14} color="#2b1a0a" strokeWidth={2.4} />
                      </g>
                    );
                  }}
                />
              );
            })}
            <Tooltip content={ChartTip} cursor={{ strokeWidth: 1 }} isAnimationActive={false} />
            <Area
              type={curve}
              dataKey="y"
              strokeWidth={2}
              fill={`url(#${id}-fill)`}
              activeDot={{ r: 4 }}
              isAnimationActive={!reduce}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <defs>
              <radialGradient id={`${id}-coin`} cx="35%" cy="30%">
                <stop offset="0%" stopColor="#ffe7a8" />
                <stop offset="55%" stopColor="#e0a84a" />
                <stop offset="100%" stopColor="#8a5a1e" />
              </radialGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {milestones.length > 0 && (
        <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {milestones.map((m) => {
            const Icon = ICONS[m.kind];
            return (
              <span key={`${m.kind}-${m.x}-legend`} className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5 text-primary" aria-hidden />
                {m.label}
              </span>
            );
          })}
        </figcaption>
      )}
    </figure>
  );
}
