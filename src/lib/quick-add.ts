/** Any Quick add button opens the one sheet mounted in the app layout. */
export const QUICK_ADD_EVENT = "quick-add:open";

export function openQuickAdd(): void {
  window.dispatchEvent(new Event(QUICK_ADD_EVENT));
}
