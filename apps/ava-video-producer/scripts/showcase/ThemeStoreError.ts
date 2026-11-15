import type { VideoThemeIssue } from "../../src/videoTheme/videoTheme.types";

/** A refused theme operation, with the HTTP status the routes send. */
export class ThemeStoreError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 413 | 428;
  readonly issues: readonly VideoThemeIssue[];

  constructor(
    status: ThemeStoreError["status"],
    message: string,
    issues: readonly VideoThemeIssue[] = [],
  ) {
    super(message);
    this.name = "ThemeStoreError";
    this.status = status;
    this.issues = issues;
  }
}
