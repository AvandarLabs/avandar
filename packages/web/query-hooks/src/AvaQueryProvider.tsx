import type { AvaQueryErrorReporter } from "@query-hooks/ErrorReporterContext";
import type { ReactElement, ReactNode } from "react";

import {
  defaultReportError,
  ErrorReporterContext,
} from "@query-hooks/ErrorReporterContext";
import { useMemo } from "react";

/**
 * Supplies configuration to `@avandar/query-hooks` hooks.
 *
 * Mounting this is optional. Without it, unhandled query and mutation errors
 * go to `console.error`.
 *
 * ```tsx
 * <AvaQueryProvider
 *   onError={({ title, message }) => notifyError({ title, message })}
 * >
 *   <App />
 * </AvaQueryProvider>
 * ```
 *
 * @param props.onError Called when a query or mutation fails and the caller
 *   supplied no `onError` of its own.
 */
export function AvaQueryProvider(props: {
  children: ReactNode;
  onError?: AvaQueryErrorReporter;
}): ReactElement {
  const { children, onError } = props;
  const reporter = useMemo(() => {
    return onError ?? defaultReportError;
  }, [onError]);

  return (
    <ErrorReporterContext.Provider value={reporter}>
      {children}
    </ErrorReporterContext.Provider>
  );
}
