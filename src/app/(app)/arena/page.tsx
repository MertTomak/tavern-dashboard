import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function ArenaPage() {
  return (
    <Suspense>
      <ComingSoon page="arena" />
    </Suspense>
  );
}
