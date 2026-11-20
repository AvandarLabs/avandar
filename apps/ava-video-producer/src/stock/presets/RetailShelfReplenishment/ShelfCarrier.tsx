import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The intact carrier advances with its authored incoming load. */
export function ShelfCarrier({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const carrierX = mix(
    motion.ramp(frame, 38, motion.hero, motion.travel.easing),
    100,
    0,
  );
  return (
    <g data-carrier={input.deliveryMode} transform={`translate(${carrierX} 0)`}>
      <SketchedShape
        shape={{ kind: "path", d: "M680 354 V424 H814 V344 M680 424 L665 330" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <CarrierWheel cx={700} isBike={input.deliveryMode === "cargo-bike"} />
      <CarrierWheel cx={800} isBike={input.deliveryMode === "cargo-bike"} />
      {input.deliveryMode === "cargo-bike" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M700 424 L730 344 L765 424 H700 L750 370 H790",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : undefined}
    </g>
  );
}

/** A wheel: large on a cargo bike, small on a trolley. */
function CarrierWheel({
  cx,
  isBike,
}: Readonly<{ cx: number; isBike: boolean }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "circle",
        cx,
        cy: 424,
        r: isBike ? 20 : 10,
      }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}
