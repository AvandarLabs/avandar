import type { VideoThemeIssue } from "./videoTheme.types";

/**
 * A theme that cannot resolve: a missing or cyclic reference, an unknown
 * theme, or a rule such as measured fonts for graphic text. Carries every
 * issue by token path, so a save route can report them and the editor can
 * mark the offending controls.
 */
export class VideoThemeError extends Error {
  readonly issues: readonly VideoThemeIssue[];

  constructor(issues: readonly VideoThemeIssue[]) {
    super(
      issues
        .map((issue) => {
          return `${issue.path}: ${issue.message}`;
        })
        .join("\n"),
    );
    this.name = "VideoThemeError";
    this.issues = issues;
  }
}
