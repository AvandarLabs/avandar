import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";

import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";

type Props = {
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onClick: () => void;
};

/** Cluster button that opens the buffer distance popover. */
export function BufferMapToolTrigger({
  label,
  icon,
  isOpen,
  onClick,
}: Props): ReactNode {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-label={label}
        aria-expanded={isOpen}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
