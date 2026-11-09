import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { PlaceMapToolTrigger } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapToolTrigger";
import { PlaceToolSteps } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceToolSteps";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/**
 * "Add a place": writes a point into a places dataset by map click, typed
 * coordinates, or address search. The popover hides while a map click is
 * awaited and reopens on the clicked point.
 */
export function PlaceMapTool({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const label = t`Add a place`;
  const isOpen = controller.state.draft !== undefined && !controller.isArmed;
  return (
    <Popover
      opened={isOpen}
      onDismiss={controller.state.close}
      position="top"
      width={320}
      withArrow
      shadow="md"
      withinPortal
      transitionProps={{ duration: 0 }}
    >
      <Popover.Target>
        <PlaceMapToolTrigger
          label={label}
          isOpen={isOpen}
          isArmed={controller.isArmed}
          onClick={isOpen ? controller.state.close : controller.state.startNew}
        />
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <PlaceToolSteps controller={controller} />
      </Popover.Dropdown>
    </Popover>
  );
}
