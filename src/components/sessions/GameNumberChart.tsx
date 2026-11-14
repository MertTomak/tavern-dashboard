"use client";

import { useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatPercent } from "@/lib/format";
import { t } from "@/i18n";

export type GameNumberPoint = { gameNumber: number; rate: number; n: number; wins: number; losses: number; lowSample: boolean };

function Tip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as GameNumberPoint | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-xs border border-primary/40 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-panel">
      <div className="text-muted-foreground">{t.sessions.gameNumber(p.gameNumber)}</div>
      <div className="stat text-base font-bold">{formatPercent(p.rate)}</div>
      <div className="stat text-muted-foreground">{t.sessions.chartTip(t.decks.record(p.wins, p.losses), p.n)}</div>
    </div>
  );
}

/**
 * Win rate of the 1st, 2nd, 3rd … game of a session. Bars are verdigris at or
 * above 50% and ember below; positions with few games are faded. The tooltip
 * always shows the record and n.
 */
export function GameNumberChart({ points }: { points: GameNumberPoint[] }) {
  const reduce = useReducedMotion();
  return (
    <figure className="hs-chart m-0">
      <div role="img" aria-label={t.sessions.chartLabel} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="gameNumber" axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => formatPercent(v).replace(".0", "")} axisLine={false} tickLine={false} width={44} />
            <ReferenceLine y={0.5} strokeDasharray="4 4" />
            <Tooltip content={Tip} cursor={{ fillOpacity: 0.06 }} isAnimationActive={false} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={56} minPointSize={3} isAnimationActive={!reduce} animationDuration={550} animationEasing="ease-out">
              {points.map((p) => (
                <Cell key={p.gameNumber} className={p.rate >= 0.5 ? "fill-win" : "fill-loss"} fillOpacity={p.lowSample ? 0.4 : 0.95} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
