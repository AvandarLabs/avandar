import { Badge, Button, Group, TextInput } from "@mantine/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import css from "./ThemeBar.module.css";
import {
  getThemeBarActions,
  getThemeBarMessage,
  getThemeLabelFromInput,
  submitNewThemeName,
  type ThemeBarMessage,
} from "./themeBarState/themeBarState";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";
import type {
  ThemeCopyStatus,
  ThemeSaveStatus,
} from "../useVideoThemeDraft/useThemeSaving";

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

function useStatusText(): (message: ThemeBarMessage) => string {
  const texts: Readonly<Record<ThemeBarMessage, string>> = {
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
  return (message) => texts[message];
}

function SaveAsNewForm({
  onSubmit,
  onCancel,
}: Readonly<{
  onSubmit: (label: string) => Promise<void>;
  onCancel: () => void;
}>) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const label = getThemeLabelFromInput(input);
  useEffect(() => inputRef.current?.focus(), []);
  return (
    <form
      className={css.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (label) {
          void onSubmit(label);
        }
      }}
    >
      <TextInput
        ref={inputRef}
        size="xs"
        label="New theme name"
        value={input}
        onChange={(event) => setInput(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <Group gap="xs">
        <Button size="compact-xs" type="submit" disabled={!label}>
          {"Create theme"}
        </Button>
        <Button size="compact-xs" variant="subtle" onClick={onCancel}>
          {"Cancel"}
        </Button>
      </Group>
    </form>
  );
}

function ThemePicker(
  props: Pick<Props, "themes" | "themeId" | "isDirty" | "onSelectTheme"> &
    Readonly<{ isDisabled: boolean }>,
) {
  return (
    <Group gap="xs" wrap="nowrap">
      <AtlasSelect
        aria-label="Theme"
        data={props.themes.map(({ id, label, builtIn }) => ({
          value: id,
          label: builtIn ? `${label} (built-in)` : label,
        }))}
        value={props.themeId}
        disabled={props.isDisabled}
        onChange={(id) => id && props.onSelectTheme(id)}
      />
      {props.isDirty ? (
        <Badge size="sm" variant="light">
          {"Unsaved changes"}
        </Badge>
      ) : null}
    </Group>
  );
}

function ThemeActions(
  props: Props &
    Readonly<{
      onStartNaming: () => void;
      saveAsNewRef: RefObject<HTMLButtonElement | null>;
    }>,
) {
  const actions = getThemeBarActions(props);
  return (
    <div className={css.actions}>
      <div className={css.actionGroup}>
        {actions.showsSave ? (
          <Button
            size="compact-xs"
            disabled={!actions.canSave}
            onClick={props.onSave}
          >
            {"Save"}
          </Button>
        ) : null}
        <Button
          ref={props.saveAsNewRef}
          size="compact-xs"
          variant="default"
          disabled={!actions.canSaveAsNew}
          onClick={props.onStartNaming}
        >
          {"Save as new theme"}
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={!actions.canDiscard}
          onClick={props.onDiscard}
        >
          {"Discard"}
        </Button>
        {actions.showsReload ? (
          <Button
            size="compact-xs"
            variant="default"
            onClick={props.onReloadTheme}
          >
            {"Reload from file"}
          </Button>
        ) : null}
      </div>
      <Button
        className={css.copyJson}
        size="compact-xs"
        variant="subtle"
        onClick={props.onCopyJson}
      >
        {"Copy JSON"}
      </Button>
    </div>
  );
}

/**
 * The theme picker and theme actions above the editor (a focusable group, so
 * focus can land here when Reload from file is gone): Save (custom themes
 * only), Save as new theme, Discard, and Copy JSON (plus Reload from file after a save conflict), with an unsaved
 * indicator, a polite status line that also says why saving is unavailable,
 * and, for a built-in theme, a notice that its changes are saved as a new
 * theme. The new theme's name form stays open, with the typed name, until
 * the theme is created, so a failed save does not lose the name.
 */
export function ThemeBar(props: Props) {
  const statusText = useStatusText();
  const [isNaming, setIsNaming] = useState(false);
  const saveAsNewRef = useRef<HTMLButtonElement>(null);
  const closeNaming = () => {
    setIsNaming(false);
    saveAsNewRef.current?.focus();
  };
  return (
    <div
      ref={props.barRef}
      className={css.bar}
      role="group"
      aria-label="Theme controls"
      tabIndex={-1}
    >
      <ThemePicker
        {...props}
        isDisabled={!getThemeBarActions(props).canSwitchTheme}
      />
      {props.isBuiltIn ? (
        <p className={css.notice}>
          {
            "Changes to a built-in theme are saved as a new theme. The new theme leaves out this theme's settings for single compositions, so each composition uses the theme's own colours."
          }
        </p>
      ) : null}
      <ThemeActions
        {...props}
        saveAsNewRef={saveAsNewRef}
        onStartNaming={() => setIsNaming(true)}
      />
      {isNaming ? (
        <SaveAsNewForm
          onCancel={closeNaming}
          onSubmit={(label) =>
            submitNewThemeName({
              label,
              saveAsNew: props.onSaveAsNew,
              close: closeNaming,
            })
          }
        />
      ) : null}
      <p className={css.status} role="status" aria-live="polite">
        {statusText(getThemeBarMessage(props))}
      </p>
    </div>
  );
}
