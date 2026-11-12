import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function MatchupsPage() {
  return (
    <Suspense>
      <ComingSoon page="matchups" />
    </Suspense>
  );
}
