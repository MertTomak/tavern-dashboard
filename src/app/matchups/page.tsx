import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function MatchupsPage() {
  return (
    <>
      <PageHeader title={tr.pages.matchups.title} description={tr.pages.matchups.description} />
      <EmptyState />
    </>
  );
}
