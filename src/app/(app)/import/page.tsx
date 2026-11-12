import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function ImportPage() {
  return (
    <>
      <PageHeader title={t.pages.import.title} description={t.pages.import.description} />
      <EmptyState />
    </>
  );
}
