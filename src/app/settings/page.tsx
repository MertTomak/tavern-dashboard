import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { tr } from "@/i18n/tr";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={tr.pages.settings.title} description={tr.pages.settings.description} />
      <EmptyState />
    </>
  );
}
