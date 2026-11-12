import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function ArenaPage() {
  return (
    <>
      <PageHeader title={t.pages.arena.title} description={t.pages.arena.description} />
      <EmptyState />
    </>
  );
}
