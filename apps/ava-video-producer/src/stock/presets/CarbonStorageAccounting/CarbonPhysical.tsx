import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CarbonOperator } from "./CarbonOperator";
import { CarbonPhysicalLabels } from "./CarbonPhysicalLabels";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The ribbon width of the whole captured quantity. */
const RIBBON_WIDTH = 24;
/** The vessel's tint before any carbon is stored. */
const VESSEL_TINT_FLOOR = 0.04;
/** How much the vessel's tint grows with the share of carbon it retains. */
const VESSEL_TINT_RANGE = 0.12;

/** An operator cues separate retained and released physical CO2 ribbons. */
export function CarbonPhysical({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const transfer = motion.ramp(
    frame,
    60,
    motion.scale(48),
    motion.travel.easing,
  );
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const retainedShare = retained / input.capture.capturedTonnesCO2;
  return (
    <g data-retained={retained}>
      <SketchedShape
        shape={{ kind: "path", d: "M50 290 V412 H475" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.boundary.join(" ")}
      />
      <StockRect
        x={205}
        y={284}
        width={92}
        height={86}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M213 294 H287 M213 302 H287 M213 310 H287" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M70 360 H245" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(24)}
        strokeOpacity={scales.wash(atomic.opacity["22"])}
        fill="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M260 360 V${mix(transfer, 360, 465)} H${mix(transfer, 260, 345)}`,
        }}
        profile={tokens.sketch.shape}
        data-retained-ribbon
        data-tonnes={retained}
        stroke={accent}
        strokeWidth={scales.stroke(RIBBON_WIDTH * retainedShare)}
        fill="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M260 360 H${mix(transfer, 260, 520)} V${mix(transfer, 360, 270)}`,
        }}
        profile={tokens.sketch.shape}
        data-released-ribbon
        data-tonnes={input.capture.releasedTonnesCO2}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(
          RIBBON_WIDTH *
            (input.capture.releasedTonnesCO2 / input.capture.capturedTonnesCO2),
        )}
        fill="none"
      />
      {input.view === "cutaway" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M245 435 H474 M245 535 H474" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.line}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M275 520 V535 M445 520 V535" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      )}
      <StockRect
        data-storage-vessel={input.view}
        x={275}
        y={438}
        width={170}
        height={82}
        rx={scales.corner(22)}
        fill={accent}
        fillOpacity={scales.wash(
          VESSEL_TINT_FLOOR + VESSEL_TINT_RANGE * transfer * retainedShare,
        )}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <CarbonOperator frame={frame} /> <CarbonPhysicalLabels input={input} />
    </g>
  );
}
