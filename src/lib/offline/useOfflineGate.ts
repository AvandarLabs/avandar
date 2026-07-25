import { useLingui } from "@lingui/react/macro";
import { notifyError } from "@ui";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";

type Gate = {
  /** True when offline: wire to a Button `disabled` prop or `OfflineGated`. */
  isBlocked: boolean;
  /**
   * Wrap an onClick handler so it short-circuits with a toast when offline.
   */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

/**
 * Hook for gating network-dependent UI when the browser is offline. Returns:
 * - `isBlocked`: true while offline; wire it to a `disabled` prop (or the
 *   `OfflineGated` wrapper) to disable an action up front.
 * - `guard`: wraps an event handler so it short-circuits with an "Unavailable
 *   offline" toast instead of running when there is no connection.
 *
 * Useful for any control that needs the network (cloud saves, syncs, uploads,
 * remote queries). `isBlocked` covers the passive disabled state; `guard`
 * re-checks `navigator.onLine` at click time, so it also catches the click
 * that slips through when the connection drops between render and click,
 * giving the user a clear reason instead of a silent failure.
 */
export function useOfflineGate(): Gate {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const offlineToastMessage = t`Unavailable offline`;

  return {
    isBlocked: !isOnline,
    guard: ((fn) => {
      return ((...args) => {
        if (!navigator.onLine) {
          notifyError(offlineToastMessage);
          return undefined;
        }
        return fn(...args);
      }) as typeof fn;
    }) as Gate["guard"],
  };
}
