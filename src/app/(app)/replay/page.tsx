import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReplayPlayer } from "@/components/demo/ReplayPlayer";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.replay.title };

/** The deck tracker playing back a recorded game (not in the menu; linked from the demo banner). */
export default function ReplayPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.replay.title} description={t.replay.description} />
      <ReplayPlayer />
    </div>
  );
}
