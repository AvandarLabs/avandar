import { createContext, useContext, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * How this package surfaces errors that no caller handled.
 *
 * `@avandar/query-hooks` deliberately does not know how your app reports
 * errors, so the host application supplies the reporter.
 *
 * Do not import `notifyError` from `@avandar/ui` here instead. That couples the
 * two packages together and drags a notification system into anything that
 * merely wants query hooks.
 */
export type AvaQueryErrorReporter = (error: {
  title: string;
  message: string;
  /** The original thrown value, for logging or re-reporting. */
  cause: unknown;
}) => void;

const defaultReportError: AvaQueryErrorReporter = ({
  title,
  message,
  cause,
}) => {
  console.error(`${title}: ${message}`, cause);
};

const ErrorReporterContext =
  createContext<AvaQueryErrorReporter>(defaultReportError);

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

/**
 * Returns the configured error reporter, falling back to `console.error` when
 * no `AvaQueryProvider` is mounted.
 */
export function useAvaQueryErrorReporter(): AvaQueryErrorReporter {
  return useContext(ErrorReporterContext);
}
