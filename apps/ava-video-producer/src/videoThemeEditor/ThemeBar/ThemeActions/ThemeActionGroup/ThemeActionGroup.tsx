import { Button } from "@mantine/core";
import css from "./ThemeActionGroup.module.css";
import type { ThemeBarActions } from "../../themeBarHelpers/themeBarHelpers";
import type { ReactNode, RefObject } from "react";

type Props = Readonly<{
  actions: ThemeBarActions;
  saveAsNewRef: RefObject<HTMLButtonElement | null>;
  onSave: () => void;
  onStartNaming: () => void;
  onDiscard: () => void;
  onReloadTheme: () => void;
}>;

/**
 * The theme's own actions: Save, Save as new theme, Discard, and Reload from
 * file.
 */
export function ThemeActionGroup({
  actions,
  saveAsNewRef,
  onSave,
  onStartNaming,
  onDiscard,
  onReloadTheme,
}: Props): ReactNode {
  return (
    <div className={css.themeActionGroup}>
      {actions.showsSave ? (
        <Button size="compact-xs" disabled={!actions.canSave} onClick={onSave}>
          {"Save"}
        </Button>
      ) : null}
      <Button
        ref={saveAsNewRef}
        size="compact-xs"
        variant="default"
        disabled={!actions.canSaveAsNew}
        onClick={onStartNaming}
      >
        {"Save as new theme"}
      </Button>
      <Button
        size="compact-xs"
        variant="subtle"
        disabled={!actions.canDiscard}
        onClick={onDiscard}
      >
        {"Discard"}
      </Button>
      {actions.showsReload ? (
        <Button size="compact-xs" variant="default" onClick={onReloadTheme}>
          {"Reload from file"}
        </Button>
      ) : null}
    </div>
  );
}
