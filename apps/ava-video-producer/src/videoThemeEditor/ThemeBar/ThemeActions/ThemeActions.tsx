import { Button } from "@mantine/core";
import {
  getThemeBarActions,
  type ThemeBarInput,
} from "../themeBarHelpers/themeBarHelpers";
import { ThemeActionGroup } from "./ThemeActionGroup/ThemeActionGroup";
import css from "./ThemeActions.module.css";
import type { RefObject } from "react";

type Props = ThemeBarInput &
  Readonly<{
    saveAsNewRef: RefObject<HTMLButtonElement | null>;
    onSave: () => void;
    onStartNaming: () => void;
    onDiscard: () => void;
    onReloadTheme: () => void;
    onCopyJson: () => void;
  }>;

/** The theme's actions, with Copy JSON at the end of the row. */
export function ThemeActions({
  saveAsNewRef,
  onSave,
  onStartNaming,
  onDiscard,
  onReloadTheme,
  onCopyJson,
  ...input
}: Props) {
  return (
    <div className={css.themeActions}>
      <ThemeActionGroup
        actions={getThemeBarActions(input)}
        saveAsNewRef={saveAsNewRef}
        onSave={onSave}
        onStartNaming={onStartNaming}
        onDiscard={onDiscard}
        onReloadTheme={onReloadTheme}
      />
      <Button
        className={css.themeActionsCopyJson}
        size="compact-xs"
        variant="subtle"
        onClick={onCopyJson}
      >
        {"Copy JSON"}
      </Button>
    </div>
  );
}
