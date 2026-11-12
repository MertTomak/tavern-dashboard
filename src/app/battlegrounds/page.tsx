import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function BattlegroundsPage() {
  return (
    <>
      <PageHeader title={tr.pages.battlegrounds.title} description={tr.pages.battlegrounds.description} />
      <EmptyState />
    </>
  );
}
