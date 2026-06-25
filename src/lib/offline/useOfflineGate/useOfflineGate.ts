import { useLingui } from "@lingui/react/macro";
import { notifyError } from "@ui";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";

type Gate = {
  /**
   * True when offline. Wire this to a Button's `disabled` prop or other
   * offline-aware UI that needs a boolean. For wrapping a child in the
   * muted-and-tooltip-on-hover treatment, use `<OfflineGated>` directly —
   * it reads the offline state itself.
   */
  isBlocked: boolean;

  /**
   * Wrap an onClick handler so it short-circuits with a toast when offline.
   */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

/**
 * Returns an `isBlocked` flag for offline-aware UI plus a `guard` wrapper
 * that short-circuits an onClick handler and toasts when offline. Wrap
 * any onClick that should not run offline with `guard(...)`, and use
 * `isBlocked` for `disabled` props or conditional rendering.
 */
export function useOfflineGate(): Gate {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const offlineToastMessage = t`Unavailable offline`;

  return {
    isBlocked: !isOnline,
    guard: (fn) => {
      return ((...args) => {
        if (!navigator.onLine) {
          notifyError(offlineToastMessage);
          return undefined;
        }
        return fn(...args);
      }) as typeof fn;
    },
  };
}
