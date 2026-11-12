import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function BattlegroundsPage() {
  return (
    <Suspense>
      <ComingSoon page="battlegrounds" />
    </Suspense>
  );
}
