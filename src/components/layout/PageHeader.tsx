type PageHeaderProps = { title: string; description: string; action?: React.ReactNode };

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-title-gold [font-variation-settings:'opsz'_96] md:text-5xl">
          {title}
        </h1>
        <p className="mt-2 max-w-[65ch] text-ink-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
