import { SketchedShape } from "../../../primitives/SketchedShape";
import { AttributeAttachments } from "../AttributeAttachments";
import { DraftRelationArrowhead } from "./DraftRelationArrowhead";
import { useDraftRelationPresentation } from "./useDraftRelationPresentation";
import type { Input } from "../UtteranceToModelDraft.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Arrowhead follows the supplied directed relation in either layout. */
export function DraftRelation(props: Readonly<Props>): ReactNode {
  const presentation = useDraftRelationPresentation(props);

  return (
    <g
      opacity={presentation.motion.ramp(
        props.frame,
        75,
        presentation.motion.scale(30),
      )}
    >
      <SketchedShape
        shape={{ kind: "path", d: presentation.path }}
        profile={presentation.tokens.sketch.shape}
        data-relation-arrow="true"
        data-from={presentation.relation.fromEntityId}
        data-to={presentation.relation.toEntityId}
        data-source-coordinate={presentation.source}
        data-target-coordinate={presentation.target}
        fill="none"
        stroke={props.accent}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.default,
        )}
      />
      <DraftRelationArrowhead {...presentation} />
      <SketchedShape
        shape={{
          kind: "path",
          d: presentation.stacked ? "M410 348 H470" : "M492 265 V315",
        }}
        profile={presentation.tokens.sketch.shape}
        data-relation-hinge="true"
        stroke={props.accent}
        fill="none"
      />
      <AttributeAttachments
        input={props.input}
        stacked={presentation.stacked}
      />
    </g>
  );
}
