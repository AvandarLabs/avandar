import { RehearsalBaselineMarker } from "../RehearsalBaselineMarker/RehearsalBaselineMarker";
import type { RehearsalOutputGetRehearsalPointerStateValue } from "../RehearsalOutput";
import { RehearsalRuler } from "../RehearsalRuler";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  output: Input["outputs"][number];
  showBaselineMarkers: boolean;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  computed: RehearsalOutputGetRehearsalPointerStateValue["computed"];
  pointerX: RehearsalOutputGetRehearsalPointerStateValue["pointerX"];
  baselineX: RehearsalOutputGetRehearsalPointerStateValue["baselineX"];
  y: RehearsalOutputGetRehearsalPointerStateValue["y"];
  color: RehearsalOutputGetRehearsalPointerStateValue["color"];
};
/** Places the ruler, baseline marker, and current output value. */
export function RehearsalOutputScale({
  output,
  showBaselineMarkers,
  tokens,
  computed,
  pointerX,
  baselineX,
  y,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <RehearsalRuler
        label={output.label}
        unit={output.unit}
        min={output.min}
        max={output.max}
        value={computed}
        y={y}
      />
      <RehearsalBaselineMarker
        {...{ output, showBaselineMarkers, tokens, baselineX, y }}
        color={color}
      />
      <circle
        data-output-id={output.id}
        data-value={computed}
        cx={pointerX}
        cy={y}
        r={5}
        fill={color}
      />
    </>
  );
}
