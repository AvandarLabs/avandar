import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getMetricCountFromFrame } from "./getMetricCountFromFrame";
import { MetricBars } from "./MetricBars";
import { MetricFigure } from "./MetricFigure";
import { MetricHeading } from "./MetricHeading";
import type { Props } from "./MetricCounter.types";
import type { ReactNode } from "react";

/** Renders MetricCounter within the authored stock graphics. */
export function MetricCounter({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, corner } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { bars, value } = getMetricCountFromFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      <MetricHeading {...{ accent }} />
      <Panel x={126} y={135} width={708} height={356}>
        <MetricFigure {...{ input, frame, accent, color, motion, value }} />
        <MetricBars
          {...{
            input,
            frame,
            accent,
            atomic,
            corner,
            shapes,
            motion,
            bars,
          }}
        />
      </Panel>
      <Text role="secondary" x={480} y={550} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["metric-counter"]
              .aMeasuredArrivalFollowedByAReadingHold,
        })}
      </Text>
    </g>
  );
}
