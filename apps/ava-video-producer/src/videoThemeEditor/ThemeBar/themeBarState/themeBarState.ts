import type { ThemeSaveStatus } from "../../useVideoThemeDraft/useThemeSaving";

/** What the theme bar knows about the active theme and its last action. */
export type ThemeBarInput = Readonly<{
  isBuiltIn: boolean;
  isDirty: boolean;
  hasIssues: boolean;
  status: ThemeSaveStatus;
}>;

/**
 * Which sentence the theme bar's status line shows. The component translates
 * each key, so failures are explained from their status and issues and never
 * from the server's English message.
 */
export type ThemeBarMessage =
  | "none"
  | "saving"
  | "saved"
  | "copied"
  | "fixIssuesFirst"
  | "invalidTheme"
  | "readOnlyTheme"
  | "changedOnDisk"
  | "themeTooLarge"
  | "saveFailed";

/** Which theme actions are shown and which can start right now. */
export type ThemeBarActions = Readonly<{
  showsSave: boolean;
  canSave: boolean;
  canSaveAsNew: boolean;
  canDiscard: boolean;
}>;

const FAILURE_MESSAGES: Readonly<Record<number, ThemeBarMessage>> = {
  400: "invalidTheme",
  403: "readOnlyTheme",
  409: "changedOnDisk",
  413: "themeTooLarge",
};

function _getFailureMessage(
  status: number,
  hasTokenIssues: boolean,
): ThemeBarMessage {
  return (
    FAILURE_MESSAGES[status] ?? (hasTokenIssues ? "invalidTheme" : "saveFailed")
  );
}

/**
 * The status line's message: the last action's outcome, or, while idle, why
 * saving is unavailable, so a disabled save explains itself.
 */
export function getThemeBarMessage(input: ThemeBarInput): ThemeBarMessage {
  const { status } = input;
  switch (status.kind) {
    case "saving":
    case "saved":
    case "copied":
      return status.kind;
    case "failed":
      return _getFailureMessage(status.status, status.issues.length > 0);
    case "idle":
      return input.hasIssues ? "fixIssuesFirst" : "none";
  }
}

/**
 * Save shows for custom themes only and needs unsaved changes without issues.
 * Save as new needs no issues, Discard needs unsaved changes, and nothing
 * starts while a save is in flight.
 */
export function getThemeBarActions(input: ThemeBarInput): ThemeBarActions {
  const isIdle = input.status.kind !== "saving";
  return {
    showsSave: !input.isBuiltIn,
    canSave: !input.isBuiltIn && input.isDirty && !input.hasIssues && isIdle,
    canSaveAsNew: !input.hasIssues && isIdle,
    canDiscard: input.isDirty && isIdle,
  };
}

/** A typed new theme name without surrounding spaces, or undefined when blank. */
export function getThemeLabelFromInput(input: string): string | undefined {
  const label = input.trim();
  return label === "" ? undefined : label;
}
