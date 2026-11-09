import { Tooltip } from "@avandar/ui";
import clsx from "clsx";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { ComponentPropsWithRef, ReactNode } from "react";

type Props = Omit<ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onClick: () => void;
};

/**
 * Cluster button that opens the buffer distance popover. `Popover.Target`
 * injects a ref and its ARIA props (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`), so they are forwarded to the button: without the ref the
 * popover has nothing to anchor to. The tooltip hides while the popover is
 * open so the two never overlap.
 */
export function BufferMapToolTrigger({
  label,
  icon,
  isOpen,
  onClick,
  className,
  ...targetProps
}: Props): ReactNode {
  return (
    <Tooltip label={label} disabled={isOpen}>
      <button
        {...targetProps}
        type="button"
        className={clsx(css.mapToolClusterTool, className)}
        aria-label={label}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
