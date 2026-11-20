import { Button } from "@mantine/core";
import {
  IconChevronDown,
  IconDownload,
  IconFolderOpen,
  IconRotateClockwise,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

const ACTIONS = [
  {
    label: "Reset",
    variant: "subtle",
    Icon: IconRotateClockwise,
    side: "left",
  },
  { label: "Open", variant: "outline", Icon: IconFolderOpen, side: "left" },
  { label: "Save", variant: "outline", Icon: IconChevronDown, side: "right" },
  { label: "Export", variant: "outline", Icon: IconDownload, side: "left" },
];
const _noop = () => {};

/**
 * Native toolbar actions retain their order, icons and fixture bindings.
 */
export function ExplorerToolbarActions(): ReactNode {
  return ACTIONS.map(({ label, variant, Icon, side }) => {
    const icon = <Icon size={16} />;
    return (
      <Button
        key={label}
        variant={variant}
        color="neutral"
        size="compact-sm"
        leftSection={side === "left" ? icon : undefined}
        rightSection={side === "right" ? icon : undefined}
        onClick={_noop}
      >
        {label}
      </Button>
    );
  });
}
