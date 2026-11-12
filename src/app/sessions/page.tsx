import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function SessionsPage() {
  return (
    <>
      <PageHeader title={tr.pages.sessions.title} description={tr.pages.sessions.description} />
      <EmptyState />
    </>
  );
}
