import { ThemeApiError } from "../../ThemeApi/ThemeApiError";
import type { FailureKind, ThemeSaveStatus } from "./useThemeSaving.types";

/**
 * The status line for a failed theme request: the server's status and issues
 * for a refused one, status 0 and no issues for anything else.
 */
export function makeFailureStatusFromError(
  options: Readonly<{ error: unknown; kind: FailureKind }>,
): ThemeSaveStatus {
  const { error, kind } = options;
  return error instanceof ThemeApiError
    ? { kind, status: error.status, issues: error.issues }
    : { kind, status: 0, issues: [] };
}
