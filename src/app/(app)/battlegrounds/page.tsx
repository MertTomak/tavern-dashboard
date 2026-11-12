import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function BattlegroundsPage() {
  return (
    <>
      <PageHeader title={t.pages.battlegrounds.title} description={t.pages.battlegrounds.description} />
      <EmptyState />
    </>
  );
}
