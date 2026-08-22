import { ErrorReporterContext } from "@query-hooks/ErrorReporterContext";
import { useContext } from "react";
import type { AvaQueryErrorReporter } from "@query-hooks/ErrorReporterContext";

/**
 * Returns the configured error reporter, falling back to `console.error` when
 * no {@link AvaQueryProvider} is mounted.
 */
export function useAvaQueryErrorReporter(): AvaQueryErrorReporter {
  return useContext(ErrorReporterContext);
}
