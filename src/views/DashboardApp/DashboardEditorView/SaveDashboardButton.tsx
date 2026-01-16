import { Button } from "@mantine/core";
import { createUsePuck } from "@puckeditor/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { DashboardPuckConfig, DashboardPuckData } from "./DashboardPuck.types";

type Props = {
  onSave: (data: DashboardPuckData) => void;
};

const usePuck = createUsePuck<DashboardPuckConfig>();

export function SaveDashboardButton({ onSave }: Props): JSX.Element {
  const appState = usePuck((s) => {
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
