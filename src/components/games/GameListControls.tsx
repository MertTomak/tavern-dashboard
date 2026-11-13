"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classLabel } from "@/lib/cards/class-colors";
import { patchQuery } from "@/lib/games-list";
import { t } from "@/i18n";

type Option = { value: string; label: string };
type Props = { opponents: string[]; decks: { id: number; name: string }[] };

const ALL = "all";

function ListSelect({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  return (
    <div className="glow-hover flex items-center rounded-full border border-brass/30 bg-oak/80 pl-1">
      <span className="stat pl-3 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger aria-label={label} className="h-8 min-w-24 border-0 bg-transparent font-medium shadow-none focus-visible:ring-2 dark:bg-transparent">
          <SelectValue>{options.find((o) => o.value === value)?.label ?? t.filters.all}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Games-only filters (result, opponent, deck), kept in the URL next to the shared filter bar. */
export function GameListControls({ opponents, decks }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: "result" | "opp" | "deck", v: string) => {
    const qs = patchQuery(params.toString(), { [key]: v });
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const all = { value: ALL, label: t.filters.all };

  return (
    <div role="group" aria-label={t.a11y.filters} className="flex flex-wrap items-center gap-2">
      <ListSelect
        label={t.games.filters.result}
        value={params.get("result") ?? ALL}
        options={[all, ...(["WIN", "LOSS", "TIE"] as const).map((r) => ({ value: r, label: t.overview.result[r] }))]}
        onChange={(v) => set("result", v)}
      />
      <ListSelect
        label={t.games.filters.opponent}
        value={params.get("opp") ?? ALL}
        options={[all, ...opponents.map((c) => ({ value: c, label: classLabel(c) }))]}
        onChange={(v) => set("opp", v)}
      />
      <ListSelect
        label={t.games.filters.deck}
        value={params.get("deck") ?? ALL}
        options={[all, { value: "none", label: t.games.filters.noDeck }, ...decks.map((d) => ({ value: String(d.id), label: d.name }))]}
        onChange={(v) => set("deck", v)}
      />
    </div>
  );
}
