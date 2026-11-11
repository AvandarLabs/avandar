import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import { LayerActionItems } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionItems";
import type { ReactNode } from "react";

type Props = {
  layerName: string;
  className?: string;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
  onOpenFeatureList?: () => void;
};

/** Provides actions for one layer in the layers panel. */
export function LayerActionsMenu({
  layerName,
  className,
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
  onOpenFeatureList,
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          className={className}
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
          {...{
            onRename,
            onDuplicate,
            onZoomToLayer,
            onDelete,
            onOpenFeatureList,
          }}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
