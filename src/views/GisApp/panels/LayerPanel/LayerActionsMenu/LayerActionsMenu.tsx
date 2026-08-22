import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";

import { LayerActionItems } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionItems";

type Props = {
  layerName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

/** Provides actions for one layer in the layers panel. */
export function LayerActionsMenu({
  layerName,
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={t`More actions for the layer ${layerName}`}
        >
          <IconDotsVertical size={15} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <LayerActionItems
          {...{ onRename, onDuplicate, onZoomToLayer, onDelete }}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
