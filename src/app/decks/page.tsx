import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function DecksPage() {
  return (
    <>
      <PageHeader title={tr.pages.decks.title} description={tr.pages.decks.description} />
      <EmptyState />
    </>
  );
}
