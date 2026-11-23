import { Motion } from "../../../../motion";
import { ObservationCell } from "../ObservationCell";
import { ObservationChecks } from "./ObservationChecks";
import { ObservationHatchDefinition } from "./ObservationHatchDefinition";
import { ObservationTileCloudLayer } from "./ObservationTileCloudLayer";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { makeObservationLayoutFromInput } from "../makeObservationLayoutFromInput";
import type { ReactNode } from "react";

/** Inputs for ObservationTile. */
type ParentProps = {
  frame: number;
  accent: string;
  id: string;
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  cells: ReturnType<typeof makeObservationLayoutFromInput>["cells"];
  checks: ReturnType<typeof makeObservationLayoutFromInput>["checks"];
  lift: number;
  unfold: number;
  patternId: string;
};

/** Renders the observation tile content in authored paint order. */
export function ObservationTileContent(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={options.unfold}
      transform={`translate(0 ${Motion.mix({
        t: options.unfold,
        from: 12,
        to: 0,
      })})`}
    >
      <ObservationHatchDefinition
        tokens={options.tokens}
        scales={options.scales}
        patternId={options.patternId}
      />
      {options.cells.map((cell) => {
        return (
          <ObservationCell
            key={cell.id}
            cell={cell}
            metric={options.input.metric}
            accent={options.accent}
            patternId={options.patternId}
          />
        );
      })}
      <ObservationTileCloudLayer
        tokens={options.tokens}
        scales={options.scales}
        lift={options.lift}
      />
      <ObservationChecks
        frame={options.frame}
        tokens={options.tokens}
        scales={options.scales}
        checks={options.checks}
      />
    </g>
  );
}
