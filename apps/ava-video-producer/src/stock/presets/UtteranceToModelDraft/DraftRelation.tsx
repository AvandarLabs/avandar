import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AttributeAttachments } from "./AttributeAttachments";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Arrowhead follows the supplied directed relation in either layout. */
export function DraftRelation({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const relation = input.draft.relationships[0];
  const reversed = relation.fromEntityId === input.draft.entities[1].id;
  const stacked = input.modelLayout === "stacked";
  const source = stacked ? (reversed ? 434 : 314) : reversed ? 670 : 314;
  const target = stacked ? (reversed ? 314 : 434) : reversed ? 314 : 670;
  const path = stacked
    ? `M314 ${source} H410 V${target} H314`
    : `M${source} 285 V265 H${target} V285`;
  return (
    <g opacity={motion.ramp(frame, 75, motion.scale(30))}>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        data-relation-arrow="true"
        data-from={relation.fromEntityId}
        data-to={relation.toEntityId}
        data-source-coordinate={source}
        data-target-coordinate={target}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: stacked
            ? `M324 ${target - 5} L314 ${target} L324 ${target + 5}`
            : `M${target - 5} 277 L${target} 285 L${target + 5} 277`,
        }}
        profile={tokens.sketch.shape}
        data-direction-head="true"
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: stacked ? "M410 348 H470" : "M492 265 V315" }}
        profile={tokens.sketch.shape}
        data-relation-hinge="true"
        stroke={accent}
        fill="none"
      />
      <AttributeAttachments input={input} stacked={stacked} />
    </g>
  );
}
