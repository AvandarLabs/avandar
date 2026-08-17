import { Tooltip } from "@avandar/ui";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { ReactNode } from "react";

type Props = {
  label: string;
  icon: ReactNode;
};

/** Renders the currently available pan-and-select map tool. */
export function PanMapTool({ label, icon }: Props): ReactNode {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-pressed
        aria-label={label}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
