import { Trans } from "@lingui/react/macro";
import { Button, Kbd } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize";
import classes from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton.module.css";
import { useDashboardPuck } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuck";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

type Props = {
  onSave: (data: AvaPageData) => void;
};

function useIsMacPlatform(): boolean {
  return useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    const userAgentData = (
      navigator as Navigator & {
        userAgentData?: { platform: string };
      }
    ).userAgentData;

    if (userAgentData?.platform) {
      return /Mac|iPhone|iPod|iPad/i.test(userAgentData.platform);
    }

    return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  }, []);
}

export function SaveDashboardButton({ onSave }: Props): JSX.Element {
  const appState = useDashboardPuck((s) => {
    return s.appState;
  });
  const isMac = useIsMacPlatform();

  const handleSave = useCallback((): void => {
    onSave(appState.data as AvaPageData);
  }, [appState.data, onSave]);

  useHotkeys([["mod+S", handleSave]]);

  return (
    <Button
      size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      leftSection={<IconDeviceFloppy size={16} />}
      onClick={handleSave}
    >
      <Trans>Save</Trans>
      <span className={classes.shortcut} aria-hidden>
        <Kbd unstyled className={classes.kbdKey}>
          {isMac ? "⌘" : "Ctrl"}
        </Kbd>
        <Kbd unstyled className={classes.kbdKey}>
          S
        </Kbd>
      </span>
    </Button>
  );
}
