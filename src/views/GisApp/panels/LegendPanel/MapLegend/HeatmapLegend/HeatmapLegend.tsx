import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import css from "@/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend.module.css";

type Props = {
  ramp: readonly string[];
};

/** Renders a heatmap ramp with qualitative low and high endpoints. */
export function HeatmapLegend({ ramp }: Props): ReactNode {
  const { t } = useLingui();
  const lowLabel = t`Low`;
  const highLabel = t`High`;

  return (
    <div className={css.heatmapLegend}>
      <div
        aria-label={t`Low to High`}
        className={css.heatmapLegendGradient}
        role="img"
        style={{
          backgroundImage: `linear-gradient(to right, ${ramp.join(", ")})`,
        }}
      />
      <div className={css.heatmapLegendLabels}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
