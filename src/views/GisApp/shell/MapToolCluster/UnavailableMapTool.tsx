import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";

import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";

type Props = {
  icon: ReactNode;
  label: string;
  reason: string;
};

/** Renders an unavailable map tool with its reason in the accessible name. */
export function UnavailableMapTool({ icon, label, reason }: Props): ReactNode {
  const accessibleLabel = `${label}. ${reason}`;
  return (
    <Tooltip label={accessibleLabel}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-disabled
        aria-label={accessibleLabel}
        onClick={(event) => {
          event.preventDefault();
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
