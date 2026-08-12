import { getIsMacPlatform } from "@avandar/browser-utils";
import { Trans } from "@lingui/react/macro";
import { Button, Kbd } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useCallback } from "react";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize";
import { useDashboardPuck } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuck";
import classes from "./SaveDashboardButton.module.css";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

type Props = {
  onSave: (data: AvaPageData) => void;
};

/** Saves the current Puck data and exposes the platform keyboard shortcut. */
export function SaveDashboardButton({ onSave }: Props): ReactElement {
  const appState = useDashboardPuck((s) => {
    return s.appState;
  });
  const isMac = getIsMacPlatform();

  const onSaveClick = useCallback((): void => {
    onSave(appState.data as AvaPageData);
  }, [appState.data, onSave]);

  useHotkeys([["mod+S", onSaveClick]]);

  return (
    <Button
      size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      leftSection={<IconDeviceFloppy size={16} />}
      onClick={onSaveClick}
    >
      <Trans>Save</Trans>
      <span className={classes.saveDashboardButtonShortcut} aria-hidden>
        <Kbd unstyled className={classes.saveDashboardButtonKbdKey}>
          {isMac ? "⌘" : "Ctrl"}
        </Kbd>
        <Kbd unstyled className={classes.saveDashboardButtonKbdKey}>
          S
        </Kbd>
      </span>
    </Button>
  );
}
