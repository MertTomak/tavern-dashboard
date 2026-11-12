import { cn } from "@/lib/utils";

type Props = { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string };

/** A brass-framed panel that sits on the scene. Titles in Fraunces, data in Barlow Condensed. */
export function FramePanel({ title, hint, action, children, className }: Props) {
  return (
    <section className={cn("brass-frame brass-studs relative rounded-lg p-5 [--frame-fill:#1a130ef2] md:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-display text-2xl font-semibold text-title-gold">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
