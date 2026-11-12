import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function GamesPage() {
  return (
    <Suspense>
      <ComingSoon page="games" />
    </Suspense>
  );
}
