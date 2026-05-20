import { useLingui } from "@lingui/react/macro";
import { notifyError } from "@ui";
import { useIsOnline } from "@/lib/offline/useIsOnline";

type Gate = {
  /** True when offline: wire to a Button `disabled` prop or `OfflineGated`. */
  isBlocked: boolean;
  /**
   * Wrap an onClick handler so it short-circuits with a toast when offline.
   */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

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
