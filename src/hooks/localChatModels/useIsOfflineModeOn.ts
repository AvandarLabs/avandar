import { useSyncExternalStore } from "react";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";

/**
 * Whether the user turned offline mode on in this browser, kept current as
 * it changes. Use it to show offline mode's state, for example on a toggle.
 */
export function useIsOfflineModeOn(): boolean {
  return useSyncExternalStore(
    OfflineModeStore.subscribe,
    OfflineModeStore.isOn,
    () => {
      return false;
    },
  );
}
