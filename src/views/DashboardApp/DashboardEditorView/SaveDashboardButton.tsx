import { Button } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { DashboardPuckData } from "./DashboardPuck.types";
import { useDashboardPuck } from "./useDashboardPuck";

type Props = {
  onSave: (data: DashboardPuckData) => void;
};

export function SaveDashboardButton({ onSave }: Props): JSX.Element {
  const appState = useDashboardPuck((s) => {
    return s.appState;
  });

  return (
    <Button
      leftSection={<IconDeviceFloppy size={16} />}
      onClick={() => {
        onSave(appState.data);
      }}
    >
      Save
    </Button>
  );
}
