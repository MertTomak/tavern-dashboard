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
import { tr } from "@/i18n/tr";
import { ThemeToggle } from "./ThemeToggle";

const ALL = "all";

type Option = { value: string; label: string };

const RANGE_OPTIONS: Option[] = Object.entries(tr.filters.ranges).map(([value, label]) => ({
  value,
  label,
}));
const MODE_OPTIONS: Option[] = [
  { value: ALL, label: tr.filters.all },
  ...Object.entries(tr.filters.modes).map(([value, label]) => ({ value, label })),
];
const FORMAT_OPTIONS: Option[] = [
  { value: ALL, label: tr.filters.all },
  ...Object.entries(tr.filters.formats).map(([value, label]) => ({ value, label })),
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
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(param, String(v))}>
        <SelectTrigger aria-label={label} className="w-36">
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
      if (value === ALL || (param === "range" && value === "30d")) next.delete(param);
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
      aria-label="Filtreler"
      className="flex flex-wrap items-end gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-8"
    >
      <FilterSelect
        label={tr.filters.range}
        param="range"
        options={RANGE_OPTIONS}
        fallback={tr.filters.ranges["30d"]}
        value={params.get("range") ?? "30d"}
        onChange={update}
      />
      <FilterSelect
        label={tr.filters.mode}
        param="mode"
        options={MODE_OPTIONS}
        fallback={tr.filters.all}
        value={params.get("mode") ?? ALL}
        onChange={update}
      />
      <FilterSelect
        label={tr.filters.format}
        param="format"
        options={FORMAT_OPTIONS}
        fallback={tr.filters.all}
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
          {tr.filters.reset}
        </Button>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
