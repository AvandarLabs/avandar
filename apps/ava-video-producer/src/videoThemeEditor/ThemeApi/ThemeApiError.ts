import type { VideoThemeIssue } from "../../videoTheme/videoTheme.types";

/** A refused theme request: its HTTP status and any token problems. */
export class ThemeApiError extends Error {
  readonly status: number;
  readonly issues: readonly VideoThemeIssue[];

  /** Creates a theme request error with its HTTP status and token issues. */
  constructor(
    status: number,
    message: string,
    issues: readonly VideoThemeIssue[],
  ) {
    super(message);
    this.name = "ThemeApiError";
    this.status = status;
    this.issues = issues;
  }
}
