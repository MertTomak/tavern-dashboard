import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function GamesPage() {
  return (
    <>
      <PageHeader title={t.pages.games.title} description={t.pages.games.description} />
      <EmptyState />
    </>
  );
}
