import { useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";
import {
  IconCopy,
  IconPencil,
  IconTrash,
  IconZoomScan,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

/** Renders the rename, zoom, duplicate, and delete layer actions. */
export function LayerActionItems(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Menu.Item
        leftSection={<IconPencil size={14} stroke={1.5} />}
        onClick={props.onRename}
      >
        {t`Rename`}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconZoomScan size={14} stroke={1.5} />}
        onClick={props.onZoomToLayer}
      >
        {t`Zoom to layer`}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconCopy size={14} stroke={1.5} />}
        onClick={props.onDuplicate}
      >
        {t`Duplicate`}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        color="danger"
        leftSection={<IconTrash size={14} stroke={1.5} />}
        onClick={props.onDelete}
      >
        {t`Delete`}
      </Menu.Item>
    </>
  );
}
