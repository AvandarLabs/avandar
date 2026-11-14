import type {
  ThemeCopyStatus,
  ThemeSaveStatus,
} from "../../useVideoThemeDraft/useThemeSaving";

/** What the theme bar knows about the active theme and its last action. */
export type ThemeBarInput = Readonly<{
  isBuiltIn: boolean;
  isDirty: boolean;
  hasIssues: boolean;
  /** The changed-on-disk banner is showing, with its keep and discard actions. */
  isChangedOnDisk: boolean;
  status: ThemeSaveStatus;
  copyStatus: ThemeCopyStatus;
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
  | "copyFailed"
  | "fixIssuesFirst"
  | "invalidTheme"
  | "readOnlyTheme"
  | "changedOnDisk"
  | "changedOnDiskUseBanner"
  | "themeNameTaken"
  | "themeTooLarge"
  | "saveFailed";

/** Which theme actions are shown and which can start right now. */
export type ThemeBarActions = Readonly<{
  showsSave: boolean;
  canSave: boolean;
  canSaveAsNew: boolean;
  canDiscard: boolean;
  /** A save was refused because the file changed, and no banner offers a reload. */
  showsReload: boolean;
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
 * The status line's message: a running save, then the last copy's outcome,
 * then the last save's outcome, or, while idle, why saving is unavailable,
 * so a disabled save explains itself. A conflict
 * while the changed-on-disk banner shows points at the banner's actions
 * rather than a page reload, so the two never disagree.
 */
export function getThemeBarMessage(input: ThemeBarInput): ThemeBarMessage {
  const { status } = input;
  if (status.kind === "saving") {
    return "saving";
  }
  if (input.copyStatus !== "idle") {
    return input.copyStatus === "copied" ? "copied" : "copyFailed";
  }
  switch (status.kind) {
    case "saved":
      return status.kind;
    case "createFailed":
      return status.status === 409
        ? "themeNameTaken"
        : _getFailureMessage(status.status, status.issues.length > 0);
    case "failed":
      if (status.status === 409 && input.isChangedOnDisk) {
        return "changedOnDiskUseBanner";
      }
      return _getFailureMessage(status.status, status.issues.length > 0);
    case "idle":
      if (input.isChangedOnDisk) {
        return "changedOnDiskUseBanner";
      }
      return input.hasIssues ? "fixIssuesFirst" : "none";
  }
}

/**
 * Save shows for custom themes only. It needs unsaved changes without issues
 * and waits while the changed-on-disk banner asks what to do with them.
 * Save as new needs no issues, Discard needs unsaved changes, and nothing
 * starts while a save is in flight. Reload from file shows after a conflict the
 * changed-on-disk banner is not already answering.
 */
export function getThemeBarActions(input: ThemeBarInput): ThemeBarActions {
  const isIdle = input.status.kind !== "saving";
  return {
    showsSave: !input.isBuiltIn,
    canSave:
      !input.isBuiltIn &&
      input.isDirty &&
      !input.hasIssues &&
      !input.isChangedOnDisk &&
      isIdle,
    canSaveAsNew: !input.hasIssues && isIdle,
    canDiscard: input.isDirty && isIdle,
    showsReload:
      getThemeBarMessage({ ...input, copyStatus: "idle" }) === "changedOnDisk",
  };
}

/** A typed new theme name without surrounding spaces, or undefined when blank. */
export function getThemeLabelFromInput(input: string): string | undefined {
  const label = input.trim();
  return label === "" ? undefined : label;
}

/**
 * Submits a new theme's name and closes the name form only when the theme was
 * created. A refused save leaves the form open, so the typed name is kept.
 */
export async function submitNewThemeName(
  options: Readonly<{
    label: string;
    saveAsNew: (label: string) => Promise<boolean>;
    close: () => void;
  }>,
): Promise<void> {
  if (await options.saveAsNew(options.label)) {
    options.close();
  }
}
