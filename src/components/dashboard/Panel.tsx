import { cn } from "@/lib/utils";

type PanelProps = {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** The standard oak panel. Titles are body font; numbers inside use the `stat` utility. */
export function Panel({ title, hint, action, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-5 shadow-panel", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold text-card-foreground">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
