import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { SupportTaskBody } from "./SupportTaskBody";
import { SupportTaskMark } from "./SupportTaskMark";
import { useSupportWorktablePresentation } from "./useSupportWorktablePresentation";
import type { Input } from "../SupportRequestResponse.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The same visibly unfinished document or assembly remains at its owner's desk.
 */
export function SupportWorktable(props: Readonly<Props>): ReactNode {
  const presentation = useSupportWorktablePresentation(props);

  return (
    <g opacity={presentation.motion.reveal(props.frame, 16)}>
      <LabelSlots labels={[[props.input.task.label, 320, 238, 290, 16, 3]]} />
      <SupportTaskBody {...presentation} />
      <SupportTaskMark {...presentation} />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M300 370 H640 V388 H300 Z M320 388 V425 M620 388 V425",
        }}
        profile={presentation.tokens.sketch.shape}
        stroke={presentation.tokens.color.line}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.emphasis,
        )}
        fill={presentation.tokens.color.surface}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M205 365 v42 h55 v-42 M215 407 v18 M250 407 v18",
        }}
        profile={presentation.tokens.sketch.shape}
        stroke={props.accent}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.emphasis,
        )}
        fill="none"
      />
    </g>
  );
}
