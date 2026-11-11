import { useSyncExternalStore } from "react";
import { ProductDrawerPresence } from "@/components/Nux/NuxChecklistPanel/ProductDrawerPresence/ProductDrawerPresence";

/** Whether any Mantine `Drawer` is open, updated as drawers open and close. */
export function useIsProductDrawerOpen(): boolean {
  return useSyncExternalStore(
    ProductDrawerPresence.subscribe,
    ProductDrawerPresence.isOpen,
  );
}
