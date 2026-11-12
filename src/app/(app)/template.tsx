import * as motion from "motion/react-client";
import { DURATION, EASE_SNAP } from "@/components/motion/timing";

/** Page transition: a template re-mounts on every navigation, so each page fades and lifts in. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE_SNAP }}
    >
      {children}
    </motion.div>
  );
}
