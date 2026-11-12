import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { t } from "@/i18n";

export default function SessionsPage() {
  return (
    <>
      <PageHeader title={t.pages.sessions.title} description={t.pages.sessions.description} />
      <EmptyState />
    </>
  );
}
