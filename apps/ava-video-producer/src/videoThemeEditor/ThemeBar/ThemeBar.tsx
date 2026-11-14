import { useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import css from "./ThemeBar.module.css";
import {
  getThemeBarActions,
  getThemeBarMessage,
  getThemeLabelFromInput,
  type ThemeBarMessage,
} from "./themeBarState/themeBarState";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";
import type { ThemeSaveStatus } from "../useVideoThemeDraft/useThemeSaving";

type Props = Readonly<{
  themes: readonly ThemeSummary[];
  themeId: string;
  isBuiltIn: boolean;
  isDirty: boolean;
  hasIssues: boolean;
  status: ThemeSaveStatus;
  onSelectTheme: (themeId: string) => void;
  onSave: () => void;
  onSaveAsNew: (label: string) => void;
  onDiscard: () => void;
  onCopyJson: () => void;
}>;

function useStatusText(): (message: ThemeBarMessage) => string {
  const { t } = useLingui();
  const texts: Readonly<Record<ThemeBarMessage, string>> = {
    none: "",
    saving: t`Saving…`,
    saved: t`Theme saved.`,
    copied: t`Theme JSON copied.`,
    fixIssuesFirst: t`Fix the marked tokens before saving.`,
    invalidTheme: t`The theme has problems. Fix the marked tokens and save again.`,
    readOnlyTheme: t`Built-in themes are read-only. Save a copy as a new theme.`,
    changedOnDisk: t`This theme changed on disk. Reload the page, then save again.`,
    themeTooLarge: t`This theme is too large to save.`,
    saveFailed: t`The theme could not be saved. Check the showcase terminal.`,
  };
  return (message) => texts[message];
}

function SaveAsNewForm({
  onSubmit,
  onCancel,
}: Readonly<{ onSubmit: (label: string) => void; onCancel: () => void }>) {
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
          onSubmit(label);
        }
      }}
    >
      <TextInput
        ref={inputRef}
        size="xs"
        label={t`New theme name`}
        value={input}
        onChange={(event) => setInput(event.currentTarget.value)}
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

function ThemeActions(props: Props & Readonly<{ onStartNaming: () => void }>) {
  const { t } = useLingui();
  const actions = getThemeBarActions(props);
  return (
    <Group gap="xs">
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
      <Button size="compact-xs" variant="subtle" onClick={props.onCopyJson}>
        {t`Copy theme JSON`}
      </Button>
    </Group>
  );
}

/**
 * The theme picker and theme actions above the editor: Save (custom themes
 * only), Save as new theme, Discard, and Copy theme JSON, with an unsaved
 * indicator, a polite status line that also says why saving is unavailable,
 * and, for a built-in theme, a notice that its changes are saved as a new
 * theme.
 */
export function ThemeBar(props: Props) {
  const { t } = useLingui();
  const statusText = useStatusText();
  const [isNaming, setIsNaming] = useState(false);
  return (
    <div className={css.bar}>
      <ThemePicker {...props} />
      {props.isBuiltIn ? (
        <p className={css.notice}>
          {t`Changes to a built-in theme are saved as a new theme. New themes use theme colors in every composition.`}
        </p>
      ) : null}
      <ThemeActions {...props} onStartNaming={() => setIsNaming(true)} />
      {isNaming ? (
        <SaveAsNewForm
          onCancel={() => setIsNaming(false)}
          onSubmit={(label) => {
            setIsNaming(false);
            props.onSaveAsNew(label);
          }}
        />
      ) : null}
      <p className={css.status} role="status" aria-live="polite">
        {statusText(getThemeBarMessage(props))}
      </p>
    </div>
  );
}
