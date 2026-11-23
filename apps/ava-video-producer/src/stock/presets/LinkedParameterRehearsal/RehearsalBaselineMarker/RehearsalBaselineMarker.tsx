import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../LinkedParameterRehearsal.schema";
import type { RehearsalOutputGetRehearsalPointerStateValue } from "../RehearsalOutput";
import type { ReactNode } from "react";

type Props = {
  output: Input["outputs"][number];
  showBaselineMarkers: boolean;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  baselineX: RehearsalOutputGetRehearsalPointerStateValue["baselineX"];
  y: RehearsalOutputGetRehearsalPointerStateValue["y"];
  color: RehearsalOutputGetRehearsalPointerStateValue["color"];
};
/** Marks the output baseline when baseline markers are enabled. */
export function RehearsalBaselineMarker({
  output,
  showBaselineMarkers,
  tokens,
  baselineX,
  y,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {showBaselineMarkers ? (
        <g data-baseline-id={output.id}>
          <SketchedShape
            shape={{ kind: "circle", cx: baselineX, cy: y, r: 9 }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={color}
            strokeOpacity={tokens.alpha.guide}
          />
        </g>
      ) : undefined}
    </>
  );
}
