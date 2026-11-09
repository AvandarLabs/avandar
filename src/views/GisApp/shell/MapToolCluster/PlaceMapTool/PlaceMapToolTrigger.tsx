import { Tooltip } from "@avandar/ui";
import { IconMapPinPlus } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { ReactNode } from "react";

type Props = {
  label: string;
  isOpen: boolean;
  isArmed: boolean;
  onClick: () => void;
};

/**
 * Cluster button for "Add a place". It opens the place popover and stays
 * pressed while a map click is awaited.
 */
export function PlaceMapToolTrigger({
  label,
  isOpen,
  isArmed,
  onClick,
}: Props): ReactNode {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-label={label}
        aria-expanded={isOpen}
        aria-pressed={isArmed}
        onClick={onClick}
      >
        <IconMapPinPlus size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
