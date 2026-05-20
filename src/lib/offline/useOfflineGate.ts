import { notifyError } from "@ui";
import { useIsOnline } from "@/lib/offline/useIsOnline";

type Gate = {
  /** True when offline: wire to a Button `disabled` prop. */
  isBlocked: boolean;
  /** Tooltip text for a disabled control. */
  tooltip: string;
  /**
   * Wrap an onClick handler so it short-circuits with a toast when offline.
   */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

export function useOfflineGate(
  reason = "This action is not available offline.",
): Gate {
  const isOnline = useIsOnline();
  return {
    isBlocked: !isOnline,
    tooltip: reason,
    guard: ((fn) =>
      {return ((...args) => {
        if (!navigator.onLine) {
          notifyError(reason);
          return undefined;
        }
        return fn(...args);
      }) as typeof fn}) as Gate["guard"],
  };
}
