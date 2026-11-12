import { Suspense } from "react";
import { ComingSoon } from "@/components/tavern/ComingSoon";

export default function DecksPage() {
  return (
    <Suspense>
      <ComingSoon page="decks" />
    </Suspense>
  );
}
