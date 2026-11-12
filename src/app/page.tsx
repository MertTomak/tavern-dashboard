import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function OverviewPage() {
  return (
    <>
      <PageHeader title={tr.pages.overview.title} description={tr.pages.overview.description} />
      <EmptyState />
    </>
  );
}
