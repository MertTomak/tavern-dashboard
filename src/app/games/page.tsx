import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function GamesPage() {
  return (
    <>
      <PageHeader title={tr.pages.games.title} description={tr.pages.games.description} />
      <EmptyState />
    </>
  );
}
