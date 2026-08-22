import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconRoute } from "@tabler/icons-react";

import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";

/** Renders the isochrone map tool slot reserved for a later release. */
export function IsochroneMapTool(): ReactNode {
  const { t } = useLingui();
  const label = t`Isochrone from a point`;
  const reason = t`This tool arrives in a later release.`;
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
        <IconRoute size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
