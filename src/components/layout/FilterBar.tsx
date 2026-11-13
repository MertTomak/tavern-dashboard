"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX, SlidersHorizontal } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { QuickAddBarButton } from "@/components/quick-add/QuickAddButton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/i18n";

const ALL = "all";
const DEFAULT_RANGE = "30d";

type Option = { value: string; label: string };

const RANGE_OPTIONS: Option[] = Object.entries(t.filters.ranges).map(([value, label]) => ({
  value,
  label,
}));
const MODE_OPTIONS: Option[] = [
  { value: ALL, label: t.filters.all },
  ...Object.entries(t.filters.modes).map(([value, label]) => ({ value, label })),
];
const FORMAT_OPTIONS: Option[] = [
  { value: ALL, label: t.filters.all },
  ...Object.entries(t.filters.formats).map(([value, label]) => ({ value, label })),
];

type FilterSelectProps = {
  label: string;
  param: string;
  options: Option[];
  fallback: string;
  value: string;
  onChange: (param: string, value: string) => void;
};

function FilterSelect({ label, param, options, fallback, value, onChange }: FilterSelectProps) {
  const current = options.find((o) => o.value === value)?.label ?? fallback;
  return (
    <div className="glow-hover flex items-center rounded-full border border-brass/30 bg-oak/80 pl-1">
      <span className="stat pl-3 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(param, String(v))}>
        <SelectTrigger
          aria-label={label}
          className="h-8 min-w-28 border-0 bg-transparent font-medium shadow-none focus-visible:ring-2 dark:bg-transparent"
        >
          <SelectValue>{current}</SelectValue>
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

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (param: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const isDefault = param === "range" ? value === DEFAULT_RANGE : value === ALL;
      if (isDefault) next.delete(param);
      else next.set(param, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const active = ["range", "mode", "format", "deck", "class"].filter((k) => params.has(k)).length;
  const [sheetOpen, setSheetOpen] = useState(false);
  const range = params.get("range") ?? DEFAULT_RANGE;
  const mode = params.get("mode") ?? ALL;
  const format = params.get("format") ?? ALL;
  const label = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

  const selects = (
    <>
      <FilterSelect label={t.filters.range} param="range" options={RANGE_OPTIONS} fallback={t.filters.ranges["30d"]} value={range} onChange={update} />
      <FilterSelect label={t.filters.mode} param="mode" options={MODE_OPTIONS} fallback={t.filters.all} value={mode} onChange={update} />
      <FilterSelect label={t.filters.format} param="format" options={FORMAT_OPTIONS} fallback={t.filters.all} value={format} onChange={update} />
    </>
  );
  const reset = active > 0 && (
    <Button variant="ghost" size="sm" onClick={() => router.replace(pathname, { scroll: false })}>
      <FilterX className="size-4" aria-hidden />
      {t.filters.reset}
    </Button>
  );

  return (
    <div
      role="group"
      aria-label={t.a11y.filters}
      className="flex items-center gap-2 border-b border-brass/15 bg-oak-deep/80 px-4 py-2.5 backdrop-blur-md md:px-8"
    >
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {selects}
        {reset}
      </div>
      <p className="stat min-w-0 truncate text-sm text-brass-dim md:hidden">
        {label(RANGE_OPTIONS, range)} · {label(MODE_OPTIONS, mode)} · {label(FORMAT_OPTIONS, format)}
      </p>
      <Button variant="outline" size="sm" className="ml-auto md:hidden" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal className="size-4" aria-hidden />
        {active ? t.filters.openWithCount(active) : t.filters.open}
      </Button>
      <QuickAddBarButton />
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title={t.a11y.filters}>
        <div className="grid gap-3 [&>div]:justify-between">{selects}</div>
        {reset}
      </BottomSheet>
    </div>
  );
}
