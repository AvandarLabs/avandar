import { Tooltip } from "@avandar/ui";
import { IconMapPinPlus } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { ComponentPropsWithRef, ReactNode } from "react";

type Props = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "aria-pressed" | "onClick"
> & {
  label: string;
  isOpen: boolean;
  isArmed: boolean;
  onClick: () => void;
};

/**
 * Cluster button for "Add a place". It opens the place popover and stays
 * pressed while a map click is awaited. Its tooltip hides while the popover
 * is open so it never covers the popover. The ref and ARIA props that
 * `Popover.Target` injects pass through to the button, so the popover
 * anchors to it.
 */
export function PlaceMapToolTrigger({
  label,
  isOpen,
  isArmed,
  onClick,
  ...buttonProps
}: Props): ReactNode {
  return (
    <Tooltip label={label} disabled={isOpen}>
      <button
        {...buttonProps}
        type="button"
        className={css.mapToolClusterTool}
        aria-label={label}
        aria-pressed={isArmed}
        onClick={onClick}
      >
        <IconMapPinPlus size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
