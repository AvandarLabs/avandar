import type { TokenUsageReporter } from "../../videoTheme/tokenUsageHelpers/tokenUsageHelpers";

/**
 * A usage collector that renders can report into and React can subscribe to.
 */
export type ObservedTokenUsage = Readonly<{
  report: TokenUsageReporter;
  getPaths: () => readonly string[];
  subscribe: (listener: () => void) => () => void;
}>;

/**
 * Collects the token paths renders read and tells subscribers in a
 * microtask, after the render that reported them. Use it where a preview's
 * usage must reach UI state, such as the editor's "used by this item"
 * filter or the live player's usage messages.
 */
export function createObservedTokenUsage(): ObservedTokenUsage {
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  let paths: readonly string[] = [];
  let isScheduled = false;
  return {
    report: (path) => {
      if (seen.has(path)) {
        return;
      }
      seen.add(path);
      if (!isScheduled) {
        isScheduled = true;
        queueMicrotask(() => {
          isScheduled = false;
          paths = [...seen].sort();
          listeners.forEach((listener) => {
            listener();
          });
        });
      }
    },
    getPaths: () => {
      return paths;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
