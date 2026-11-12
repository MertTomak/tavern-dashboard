"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
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
import type { ChartPoint } from "@/components/dashboard/overview-view";

type Props = {
  data: ChartPoint[];
  kind: "percent" | "rank";
  ariaLabel: string;
  height?: number;
  /** A CSS colour token, e.g. "var(--chart-1)". */
  color?: string;
  curve?: "monotone" | "stepAfter";
};

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xs border border-primary/40 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-panel">
      {point.tip.map((line, i) => (
        <div key={i} className={i === 0 ? "stat text-base font-bold" : "text-muted-foreground"}>
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * Single-series trend (rolling win rate or ranked climb). Colours come from
 * CSS tokens via the `.hs-chart` rules, so light/dark need no JavaScript.
 * The line draws in left to right on first paint (off with reduced motion).
 */
export function TrendChart({ data, kind, ariaLabel, height = 260, color = "var(--chart-1)", curve = "monotone" }: Props) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const isPercent = kind === "percent";
  const min = isPercent ? 0 : Math.max(0, Math.floor(Math.min(...data.map((d) => d.y)) / 10) * 10);
  const max = isPercent ? 1 : LEGEND_INDEX;
  const ticks = isPercent ? [0, 0.25, 0.5, 0.75, 1] : Array.from({ length: (max - min) / 10 + 1 }, (_, i) => min + i * 10);

  return (
    <div role="img" aria-label={ariaLabel} className="hs-chart" style={{ height, ["--series" as string]: color }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--series)", stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: "var(--series)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" hide />
          <YAxis
            domain={[min, max]}
            ticks={ticks}
            tickFormatter={(v: number) => (isPercent ? formatPercent(v).replace(".0", "") : rankLabel(v))}
            axisLine={false}
            tickLine={false}
            width={isPercent ? 44 : 84}
          />
          <ReferenceLine y={isPercent ? 0.5 : LEGEND_INDEX} strokeDasharray="4 4" />
          <Tooltip content={ChartTooltip} cursor={{ strokeWidth: 1 }} isAnimationActive={false} />
          <Area
            type={curve}
            dataKey="y"
            strokeWidth={2}
            fill={`url(#${id}-fill)`}
            activeDot={{ r: 4 }}
            isAnimationActive={!reduce}
            animationDuration={550}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
