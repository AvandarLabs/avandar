import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.module.css";

/**
 * The locked legend entry shown whenever a disputed or undetermined boundary
 * is actually drawn on the map. It takes no props and offers no control: a
 * reader must never be shown a dashed line whose meaning can be hidden,
 * recolored, or removed by any author setting. Its presence is derived solely
 * from what is actually rendered, not from whether a layer's own legend is
 * shown.
 */
export function DisputedLegendRow(): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.disputedLegendRow}>
      <span
        aria-hidden
        className={css.disputedLegendRowSwatch}
        style={{ borderTopColor: DisputedBoundary.casingColors.light }}
      />
      <span>{t`Disputed or undetermined boundary`}</span>
    </div>
  );
}
