import { useEffect, useState } from "react";
import { GenericError } from "@/components/AppErrorBoundary/GenericError";
import { isSessionError } from "@/components/AppErrorBoundary/isSessionError";
import { ManualRecoveryScreen } from "@/components/AppErrorBoundary/ManualRecoveryScreen";
import {
  isSessionRecoveryLooping,
  recoverFromSessionError,
} from "@/components/AppErrorBoundary/recoverFromSessionError";
import { SessionRecoveringScreen } from "@/components/AppErrorBoundary/SessionRecoveringScreen";
import type { ErrorComponentProps } from "@tanstack/react-router";

/**
 * App-wide router error boundary (wired as the router's
 * `defaultErrorComponent`). Turns an otherwise fatal thrown error into a
 * graceful screen:
 *
 * - Session/auth failures (e.g. `JWSError JWSInvalidSignature` from a stale
 *   token) auto-recover by clearing the local session and redirecting to
 *   sign-in, so the user never sees a dead page and does not need to reach a
 *   logout button that never rendered.
 * - If that redirect loops (lands and crashes again), a manual screen offers
 *   "Sign in again" and a harder "Reset app" (clears service worker + caches).
 * - Any other error shows a friendly retry/home screen, with technical detail
 *   available only in development.
 *
 * @param props - Router error component props (`error`, `reset`).
 * @returns The recovery UI to render in place of the crashed route.
 */
export function AppErrorBoundary({
  error,
  reset,
}: ErrorComponentProps): React.ReactNode {
  const sessionError = isSessionError(error);
  // Snapshot loop state once on mount so the render stays stable across the
  // recovery redirect.
  const [looping] = useState(() => {
    return sessionError && isSessionRecoveryLooping();
  });

  useEffect(() => {
    if (sessionError && !looping) {
      void recoverFromSessionError();
    }
  }, [sessionError, looping]);

  if (sessionError) {
    return looping ? <ManualRecoveryScreen /> : <SessionRecoveringScreen />;
  }

  return <GenericError error={error} reset={reset} />;
}
