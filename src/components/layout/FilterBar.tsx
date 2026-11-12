"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/i18n";
import { ThemeToggle } from "./ThemeToggle";

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
    <div className="glow-hover flex items-center rounded-xs border border-border bg-card/70">
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

  const hasFilters = ["range", "mode", "format", "deck", "class"].some((k) => params.has(k));

  return (
    <div
      role="group"
      aria-label={t.a11y.filters}
      className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:px-8"
    >
      <FilterSelect
        label={t.filters.range}
        param="range"
        options={RANGE_OPTIONS}
        fallback={t.filters.ranges["30d"]}
        value={params.get("range") ?? DEFAULT_RANGE}
        onChange={update}
      />
      <FilterSelect
        label={t.filters.mode}
        param="mode"
        options={MODE_OPTIONS}
        fallback={t.filters.all}
        value={params.get("mode") ?? ALL}
        onChange={update}
      />
      <FilterSelect
        label={t.filters.format}
        param="format"
        options={FORMAT_OPTIONS}
        fallback={t.filters.all}
        value={params.get("format") ?? ALL}
        onChange={update}
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <FilterX className="size-4" aria-hidden />
          {t.filters.reset}
        </Button>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
