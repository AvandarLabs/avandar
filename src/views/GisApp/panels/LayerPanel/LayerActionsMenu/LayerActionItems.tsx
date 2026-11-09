import { useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";
import {
  IconCopy,
  IconPencil,
  IconTable,
  IconTrash,
  IconZoomScan,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
  /** Opens the layer's feature list; the item is hidden when unset. */
  onOpenFeatureList?: () => void;
};

/** Renders the rename, zoom, feature list, duplicate, and delete actions. */
export function LayerActionItems({
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
  onOpenFeatureList,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Menu.Item
        leftSection={<IconPencil size={14} stroke={1.5} />}
        onClick={onRename}
      >
        {t`Rename`}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconZoomScan size={14} stroke={1.5} />}
        onClick={onZoomToLayer}
      >
        {t`Zoom to layer`}
      </Menu.Item>
      {onOpenFeatureList ? (
        <Menu.Item
          leftSection={<IconTable size={14} stroke={1.5} />}
          onClick={onOpenFeatureList}
        >
          {t`Feature list`}
        </Menu.Item>
      ) : null}
      <Menu.Item
        leftSection={<IconCopy size={14} stroke={1.5} />}
        onClick={onDuplicate}
      >
        {t`Duplicate`}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        color="danger"
        leftSection={<IconTrash size={14} stroke={1.5} />}
        onClick={onDelete}
      >
        {t`Delete`}
      </Menu.Item>
    </>
  );
}
