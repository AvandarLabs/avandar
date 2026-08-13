import { createContext } from "react";

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

/** Used whenever no `AvaQueryProvider` is mounted. */
export const defaultReportError: AvaQueryErrorReporter = ({
  title,
  message,
  cause,
}) => {
  console.error(`${title}: ${message}`, cause);
};

/**
 * Carries the active error reporter to this package's hooks.
 *
 * Lives apart from the provider and the hook that use it so that neither of
 * those files exports both a component and a non-component, which would cost
 * them React Fast Refresh.
 */
export const ErrorReporterContext =
  createContext<AvaQueryErrorReporter>(defaultReportError);
