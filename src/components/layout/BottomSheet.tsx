"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

/** Phone pattern: a sheet that rises from the bottom, within thumb reach. */
export function BottomSheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brass-frame top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none p-5 pb-[max(env(safe-area-inset-bottom),20px)] [--frame-fill:#1a130e] data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8 sm:max-w-none">
        <span aria-hidden className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-parchment/25" />
        <DialogTitle className="font-display text-xl text-title-gold">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
