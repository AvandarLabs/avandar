import { useLingui } from "@lingui/react/macro";
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
  onCopyJson: () => void;
}>;

function useStatusText(): (message: ThemeBarMessage) => string {
  const { t } = useLingui();
  const texts: Readonly<Record<ThemeBarMessage, string>> = {
    none: "",
    saving: t`Saving…`,
    saved: t`Theme saved.`,
    copied: t`Theme JSON copied.`,
    copyFailed: t`The theme JSON could not be copied.`,
    fixIssuesFirst: t`Fix the marked settings before saving.`,
    invalidTheme: t`The theme has problems. Fix the marked settings and save again.`,
    readOnlyTheme: t`Built-in themes are read-only. Save a copy as a new theme.`,
    changedOnDisk: t`This theme changed on disk. Reload it from file, then save again.`,
    changedOnDiskUseBanner: t`This theme changed on disk. Keep, discard, or reload in the notice below, then save again.`,
    themeNameTaken: t`A theme with that name already exists. Pick another name.`,
    themeTooLarge: t`This theme is too large to save.`,
    saveFailed: t`The theme could not be saved. Check the showcase terminal.`,
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
  const { t } = useLingui();
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
        label={t`New theme name`}
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
          {t`Create theme`}
        </Button>
        <Button size="compact-xs" variant="subtle" onClick={onCancel}>
          {t`Cancel`}
        </Button>
      </Group>
    </form>
  );
}

function ThemePicker(
  props: Pick<Props, "themes" | "themeId" | "isDirty" | "onSelectTheme">,
) {
  const { t } = useLingui();
  return (
    <Group gap="xs" wrap="nowrap">
      <AtlasSelect
        aria-label={t`Theme`}
        data={props.themes.map(({ id, label, builtIn }) => ({
          value: id,
          label: builtIn ? t`${label} (built-in)` : label,
        }))}
        value={props.themeId}
        onChange={(id) => id && props.onSelectTheme(id)}
      />
      {props.isDirty ? (
        <Badge size="sm" variant="light">{t`Unsaved changes`}</Badge>
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
  const { t } = useLingui();
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
            {t`Save`}
          </Button>
        ) : null}
        <Button
          ref={props.saveAsNewRef}
          size="compact-xs"
          variant="default"
          disabled={!actions.canSaveAsNew}
          onClick={props.onStartNaming}
        >
          {t`Save as new theme`}
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={!actions.canDiscard}
          onClick={props.onDiscard}
        >
          {t`Discard`}
        </Button>
        {actions.showsReload ? (
          <Button
            size="compact-xs"
            variant="default"
            onClick={props.onReloadTheme}
          >
            {t`Reload from file`}
          </Button>
        ) : null}
      </div>
      <Button
        className={css.copyJson}
        size="compact-xs"
        variant="subtle"
        onClick={props.onCopyJson}
      >
        {t`Copy JSON`}
      </Button>
    </div>
  );
}

/**
 * The theme picker and theme actions above the editor: Save (custom themes
 * only), Save as new theme, Discard, and Copy JSON (plus Reload from file after a save conflict), with an unsaved
 * indicator, a polite status line that also says why saving is unavailable,
 * and, for a built-in theme, a notice that its changes are saved as a new
 * theme. The new theme's name form stays open, with the typed name, until
 * the theme is created, so a failed save does not lose the name.
 */
export function ThemeBar(props: Props) {
  const { t } = useLingui();
  const statusText = useStatusText();
  const [isNaming, setIsNaming] = useState(false);
  const saveAsNewRef = useRef<HTMLButtonElement>(null);
  const closeNaming = () => {
    setIsNaming(false);
    saveAsNewRef.current?.focus();
  };
  return (
    <div className={css.bar}>
      <ThemePicker {...props} />
      {props.isBuiltIn ? (
        <p className={css.notice}>
          {t`Changes to a built-in theme are saved as a new theme. The new theme leaves out this theme's settings for single compositions, so each composition uses the theme's own colours.`}
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
