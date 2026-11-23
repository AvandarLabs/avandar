import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Pill } from "../../graphics-common/Pill";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ChartDefinitions } from "./ChartDefinitions";
import { ChartGrid } from "./ChartGrid";
import { ChartLegend } from "./ChartLegend";
import { getTraceGeometryFromFrame } from "./getTraceGeometryFromFrame";
import { SAMPLE_NOTE_SIZE } from "./LineTrace.constants";
import { ReferenceSeries } from "./ReferenceSeries";
import { RevealedTrace } from "./RevealedTrace";
import { TraceHead } from "./TraceHead";
import type { Props } from "./LineTrace.types";
import type { ReactNode } from "react";

/** Renders the authored chart study for StockGraphic at an explicit frame. */
export function LineTrace(props: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, dash, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const geometry = getTraceGeometryFromFrame({
    input: props.input,
    frame: props.frame,
    motion,
  });
  const drawing = {
    ...props,
    atomic,
    color,
    stroke,
    dash,
    sketch,
    shapes,
    geometry,
  };
  return (
    <g>
      <ChartDefinitions {...drawing} />
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].fictionalData,
        })}
        color={props.accent}
      />
      <ChartGrid {...drawing} />
      <ReferenceSeries {...drawing} />
      <RevealedTrace {...drawing} />
      <TraceHead {...drawing} />
      <ChartLegend {...drawing} />
      <Text role="note" x={896} y={548} size={SAMPLE_NOTE_SIZE} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].samplePeriods,
        })}
      </Text>
    </g>
  );
}
