import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Pill } from "../../graphics-common/Pill";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { PILL_AT, FIGURE_SIZE } from "./MetricCounter.constants";
import type { MetricFigureData } from "./MetricCounter.types";
import type { ReactNode } from "react";

type Props = MetricFigureData;

/** Renders the metric figure layer for MetricCounter. */
export function MetricFigure(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Text x={170} y={185} fill={options.color.textMuted}>
        {options.input.label}
      </Text>
      <Text role="figure" x={165} y={301} size={FIGURE_SIZE}>
        {`${options.value.toLocaleString("en-US")}${options.input.unit}`}
      </Text>
      <g
        opacity={options.motion.ramp(
          options.frame,
          PILL_AT,
          options.motion.sheet,
        )}
      >
        <Pill
          x={170}
          y={326}
          width={173}
          text={getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["metric-counter"].sampleTotal,
          })}
          color={options.accent}
        />
      </g>
    </>
  );
}
