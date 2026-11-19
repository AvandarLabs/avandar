import { useRef, useState, type RefObject, type ReactNode } from "react";
import { SaveAsNewForm } from "./SaveAsNewForm/SaveAsNewForm";
import { ThemeActions } from "./ThemeActions/ThemeActions";
import css from "./ThemeBar.module.css";
import {
  getThemeBarActions,
  getThemeBarMessage,
  submitNewThemeName,
  type ThemeBarMessage,
} from "./themeBarHelpers/themeBarHelpers";
import { ThemePicker } from "./ThemePicker";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";
import type { ThemeCopyStatus } from "../useVideoThemeDraft/useThemeSaving/useThemeSaving";
import type { ThemeSaveStatus } from "../useVideoThemeDraft/useThemeSaving/useThemeSaving.types";

type Props = Readonly<{
  themes: readonly ThemeSummary[];
  themeId: string;
  isBuiltIn: boolean;
  isDirty: boolean;
  hasIssues: boolean;
  isChangedOnDisk: boolean;
  status: ThemeSaveStatus;
  copyStatus: ThemeCopyStatus;
  onSelectTheme: (themeId: string) => void;
  onSave: () => void;
  /** Resolves true when the theme was created. */
  onSaveAsNew: (label: string) => Promise<boolean>;
  onDiscard: () => void;
  onReloadTheme: () => void;
  /** The bar itself, so the host can move focus here when a button leaves. */
  barRef?: RefObject<HTMLDivElement | null>;
  onCopyJson: () => void;
}>;

function _buildStatusText(): (message: ThemeBarMessage) => string {
  const texts: Record<ThemeBarMessage, string> = {
    none: "",
    saving: "Saving…",
    saved: "Theme saved.",
    copied: "Theme JSON copied.",
    copyFailed: "The theme JSON could not be copied.",
    fixIssuesFirst: "Fix the marked settings before saving.",
    invalidTheme:
      "The theme has problems. Fix the marked settings and save again.",
    readOnlyTheme: "Built-in themes are read-only. Save a copy as a new theme.",
    changedOnDisk:
      "This theme changed on disk. Reload it from file, then save again.",
    changedOnDiskUseBanner:
      "This theme changed on disk. Keep, discard, or reload in the notice below, then save again.",
    themeNameTaken: "A theme with that name already exists. Pick another name.",
    themeTooLarge: "This theme is too large to save.",
    saveFailed: "The theme could not be saved. Check the showcase terminal.",
  };
  return (message) => {
    return texts[message];
  };
}

/**
 * Whether the new theme's name form is open, and where focus returns when it
 * closes.
 */
function useNamingForm() {
  const [isNaming, setIsNaming] = useState(false);
  const saveAsNewRef = useRef<HTMLButtonElement>(null);
  const closeNaming = () => {
    setIsNaming(false);
    saveAsNewRef.current?.focus();
  };
  return {
    isNaming,
    saveAsNewRef,
    closeNaming,
    startNaming: () => {
      return setIsNaming(true);
    },
  };
}

/**
 * The theme picker and theme actions above the editor (a focusable group, so
 * focus can land here when Reload from file is gone): Save (custom themes
 * only), Save as new theme, Discard, and Copy JSON (plus Reload from file
 * after a save conflict), with an unsaved indicator, a polite status line
 * that also says why saving is unavailable, and, for a built-in theme, a
 * notice that its changes are saved as a new theme. The new theme's name
 * form stays open, with the typed name, until the theme is created, so a
 * failed save does not lose the name.
 */
export function ThemeBar({ barRef, onSaveAsNew, ...state }: Props): ReactNode {
  const statusText = _buildStatusText();
  const { isNaming, saveAsNewRef, closeNaming, startNaming } = useNamingForm();
  return (
    <div
      ref={barRef}
      className={css.bar}
      role="group"
      aria-label="Theme controls"
      tabIndex={-1}
    >
      <ThemePicker
        {...state}
        isDisabled={!getThemeBarActions(state).canSwitchTheme}
      />
      {state.isBuiltIn ? (
        <p className={css.notice}>
          {
            "Changes to a built-in theme are saved as a new theme. The new theme leaves out this theme's settings for single compositions, so each composition uses the theme's own colours."
          }
        </p>
      ) : null}
      <ThemeActions
        {...state}
        saveAsNewRef={saveAsNewRef}
        onStartNaming={startNaming}
      />
      {isNaming ? (
        <SaveAsNewForm
          onCancel={closeNaming}
          onSubmit={(label) => {
            return submitNewThemeName({
              label,
              saveAsNew: onSaveAsNew,
              close: closeNaming,
            });
          }}
        />
      ) : null}
      <p className={css.status} role="status" aria-live="polite">
        {statusText(getThemeBarMessage(state))}
      </p>
    </div>
  );
}
