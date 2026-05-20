import { Trans } from "@lingui/react/macro";
import { Button, Group, Kbd } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
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
      leftSection={<IconDeviceFloppy size={16} />}
      onClick={handleSave}
      rightSection={
        <Group gap={4}>
          <Kbd size="xs">{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd size="xs">S</Kbd>
        </Group>
      }
    >
      <Trans>Save</Trans>
    </Button>
  );
}
