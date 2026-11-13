import { ViewTransition } from "react";

const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" } as const;

/**
 * Page transition. Pages sit side by side in menu order: moving forward slides the
 * new page in from the right, moving back from the left, with a slight step back in
 * depth (CSS in globals.css). Untyped transitions (filters, refresh, browser back)
 * swap without a slide. A template re-mounts on every navigation, so enter/exit fire.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
