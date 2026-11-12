import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function ArenaPage() {
  return (
    <>
      <PageHeader title={tr.pages.arena.title} description={tr.pages.arena.description} />
      <EmptyState />
    </>
  );
}
