import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function DecksPage() {
  return (
    <>
      <PageHeader title={t.pages.decks.title} description={t.pages.decks.description} />
      <EmptyState />
    </>
  );
}
