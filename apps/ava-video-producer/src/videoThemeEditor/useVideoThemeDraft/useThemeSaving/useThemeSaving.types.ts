import type { VideoThemeIssue } from "../../../videoTheme/videoTheme.types";

/** What a refused theme request reports: the HTTP status and the schema issues. */
type ThemeSaveFailure = Readonly<{
  status: number;
  issues: readonly VideoThemeIssue[];
}>;

/** What the last theme action did, for the theme bar's status line. */
export type ThemeSaveStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "saving" }>
  | Readonly<{ kind: "saved" }>
  | (Readonly<{ kind: "failed" }> & ThemeSaveFailure)
  /** Saving as a new theme was refused. A 409 means the name is taken. */
  | (Readonly<{ kind: "createFailed" }> & ThemeSaveFailure);

/** The two ways a theme request can fail, matching `ThemeSaveStatus`. */
export type FailureKind = "failed" | "createFailed";
