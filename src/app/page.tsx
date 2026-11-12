import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function OverviewPage() {
  return (
    <>
      <PageHeader title={t.pages.overview.title} description={t.pages.overview.description} />
      <EmptyState />
    </>
  );
}
