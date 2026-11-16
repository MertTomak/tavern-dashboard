import type { Milestone } from "@/lib/stats/milestones";
import type { GameResult } from "@/lib/stats/winrate";

/** Plain, serialisable Overview data for the tavern components. */

export type ChartMilestone = { x: number; kind: Milestone["kind"]; label: string };
export type ChartPoint = { x: number; y: number; tip: string[] };

export type GameCard = {
  id: string;
  result: GameResult;
  myClass: string;
  myArt: string;
  oppClass: string;
  oppArt: string;
  oppLabel: string;
  when: string;
};

export type ClassStanding = {
  cls: string;
  label: string;
  art: string;
  rate: number;
  wins: number;
  losses: number;
  n: number;
  lowSample: boolean;
};

export type DeckStanding = ClassStanding & { name: string; cardName: string | null };

export type RankState = { label: string; index: number; progress: number; legend: boolean };

/** Insights panel: up to five sentences, or one line on why there are none yet. */
export type InsightsData = { items: { id: string; severity: "info" | "good" | "warn"; text: string }[]; note: string | null };

export type OverviewData = {
  insights: InsightsData;
  rangeLabel: string;
  featured: { id: string; name: string; set: string } | null;
  winRate: number;
  wins: number;
  losses: number;
  games: number;
  today: { wins: number; losses: number; n: number };
  streak: { result: "WIN" | "LOSS"; length: number } | null;
  last7: { rate: number; n: number };
  rank: RankState | null;
  recent: GameCard[];
  classes: ClassStanding[];
  decks: DeckStanding[];
  rolling: { points: ChartPoint[]; milestones: ChartMilestone[]; window: number };
  climb: { points: ChartPoint[]; milestones: ChartMilestone[] };
};
