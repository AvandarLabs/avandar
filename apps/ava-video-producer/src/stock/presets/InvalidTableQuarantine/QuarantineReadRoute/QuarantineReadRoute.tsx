import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  readable: ReturnType<typeof getQuarantineStateFromFrame>["readable"];
};
/** Shows whether the table read path is open or blocked. */
export function QuarantineReadRoute({
  accent,
  atomic,
  tokens,
  scales,
  readable,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-read-path="true">
        <SketchedShape
          shape={{ kind: "path", d: "M640 485 H940 V180 H922" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={readable ? accent : tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          strokeDasharray={readable ? undefined : atomic.dash.long.join(" ")}
        />
      </g>
    </>
  );
}
