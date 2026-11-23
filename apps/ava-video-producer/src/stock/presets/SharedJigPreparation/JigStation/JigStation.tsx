import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { JigPattern } from "../JigPattern/JigPattern";
import { JigWorkpiece } from "./JigWorkpiece";
import { useJigStationPresentation } from "./useJigStationPresentation";
import type { Input } from "../SharedJigPreparation.schema.ts";
import type { ReactNode } from "react";

type Props = {
  collaborator: Input["collaborators"][number];
  x: number;
  hasApplication: boolean;
  isAligned: boolean;
  input: Input;
  accent: string;
};
/** A retained existing workpiece receives one matching application. */
export function JigStation(props: Readonly<Props>): ReactNode {
  const presentation = useJigStationPresentation(props);

  return (
    <g>
      <PersonGlyph
        x={props.x}
        y={275}
        color={presentation.tokens.color.accentAlt}
      />
      <LabelSlots
        labels={[
          [props.collaborator.label, props.x - 88, 200, 176, 18, 3],
          [props.collaborator.workpieceLabel, props.x - 100, 480, 200, 14, 3],
        ]}
      />
      <JigWorkpiece {...presentation} />
      {props.hasApplication ? (
        <g data-application={props.collaborator.id}>
          <JigPattern
            x={props.x - 50}
            y={350}
            pattern={props.input.guide.pattern}
            color={props.accent}
          />
        </g>
      ) : undefined}
      {props.input.showAlignmentGuides && props.isAligned ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${props.x - 58} 342 h116 v80 h-116 Z` }}
          profile={presentation.tokens.sketch.shape}
          data-alignment={props.collaborator.id}
          stroke={presentation.tokens.color.accentAlt}
          fill="none"
          strokeDasharray={presentation.tokens.dash.pending.join(" ")}
        />
      ) : undefined}
    </g>
  );
}
