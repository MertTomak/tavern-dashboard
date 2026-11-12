import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function SessionsPage() {
  return (
    <Suspense>
      <ComingSoon page="sessions" />
    </Suspense>
  );
}
