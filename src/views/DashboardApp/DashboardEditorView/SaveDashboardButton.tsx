import { Button } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useDashboardPuck } from "./useDashboardPuck";
import type { AvaPageData } from "./AvaPage.types";

type Props = {
  onSave: (data: AvaPageData) => void;
};

export function SaveDashboardButton({ onSave }: Props): JSX.Element {
  const appState = useDashboardPuck((s) => {
    return s.appState;
  });

  return (
    <Button
      leftSection={<IconDeviceFloppy size={16} />}
      onClick={() => {
        onSave(appState.data as AvaPageData);
      }}
    >
      Save
    </Button>
  );
}
