import { buildFailureStatusFromError } from "../buildFailureStatusFromError";
import type { FailureKind, ThemeSaveStatus } from "../useThemeSaving.types";
import type { RefObject } from "react";

/**
 * Runs one theme request with its status updates and resolves true when it
 * succeeded. A request started while another is in flight is ignored and
 * resolves false, so a double click cannot send the same stale hash twice.
 * A failure is reported as `failureKind`, which a create sets to
 * `createFailed` so its conflict is not read as a changed file.
 */
export async function runThemeRequest(
  options: Readonly<{
    inFlight: RefObject<boolean>;
    setStatus: (status: ThemeSaveStatus) => void;
    request: () => Promise<void>;
    failureKind?: FailureKind;
  }>,
): Promise<boolean> {
  const { inFlight, setStatus, request, failureKind = "failed" } = options;
  if (inFlight.current) {
    return false;
  }
  inFlight.current = true;
  setStatus({ kind: "saving" });
  try {
    await request();
    setStatus({ kind: "saved" });
    return true;
  } catch (error) {
    setStatus(buildFailureStatusFromError({ error, kind: failureKind }));
    return false;
  } finally {
    inFlight.current = false;
  }
}
