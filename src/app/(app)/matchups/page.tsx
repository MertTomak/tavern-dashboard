import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function MatchupsPage() {
  return (
    <>
      <PageHeader title={t.pages.matchups.title} description={t.pages.matchups.description} />
      <EmptyState />
    </>
  );
}
