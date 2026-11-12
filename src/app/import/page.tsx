import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function ImportPage() {
  return (
    <>
      <PageHeader title={tr.pages.import.title} description={tr.pages.import.description} />
      <EmptyState />
    </>
  );
}
