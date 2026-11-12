import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function ImportPage() {
  return (
    <Suspense>
      <ComingSoon page="import" />
    </Suspense>
  );
}
