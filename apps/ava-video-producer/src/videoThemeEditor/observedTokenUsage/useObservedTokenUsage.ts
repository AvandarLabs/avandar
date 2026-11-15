import { useState, useSyncExternalStore } from "react";
import { createObservedTokenUsage } from "./observedTokenUsage";
import type { TokenUsageReporter } from "../../videoTheme/tokenUsageHelpers/tokenUsageHelpers";

/**
 * A reporter to put in `VideoTokenUsageContext` around a preview, and the
 * token paths it has seen so far. One collector lives as long as the
 * component that calls this.
 */
export function useObservedTokenUsage(): {
  report: TokenUsageReporter;
  paths: readonly string[];
} {
  const [usage] = useState(createObservedTokenUsage);
  const paths = useSyncExternalStore(
    usage.subscribe,
    usage.getPaths,
    usage.getPaths,
  );
  return { report: usage.report, paths };
}
