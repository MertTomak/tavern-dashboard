import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { PowerLogDrop } from "@/components/import/PowerLogDrop";
import { ImportHistory, type BatchRow } from "@/components/import/ImportHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { listImportBatches } from "@/lib/db/queries/import";
import { t } from "@/i18n";

async function History() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const batches = listImportBatches() as BatchRow[];
  return <ImportHistory batches={batches} />;
}

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.import.title} description={t.pages.import.description} />
      <div className="grid grid-cols-1 gap-6">
        <PowerLogDrop />
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg bg-card" />}>
          <History />
        </Suspense>
      </div>
    </div>
  );
}
