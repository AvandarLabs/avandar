import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  DEMONSTRATE_CUE,
  HANDOFF_CUE,
  RELEASE_CUE,
  SECOND_DEMONSTRATION_CUE,
} from "./exchangeTiming";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; toolX: number };

/** Frames the first expert takes to reach for the tool. */
const REACH_FRAMES = 15;
/** Equal-scale participants retain names and organizational roles. */
export function ExpertiseParticipants({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const topic = input.topics[frame < HANDOFF_CUE ? 0 : 1];
  const reach = ramp(
    frame,
    DEMONSTRATE_CUE,
    motion.scale(REACH_FRAMES),
    motion.entrance.easing,
  );
  return (
    <g>
      {input.people.map((person, index) => {
        const x =
          index === 0
            ? input.tableArrangement === "side-by-side"
              ? 350
              : 210
            : input.tableArrangement === "side-by-side"
              ? 610
              : 750;
        const labelX =
          input.tableArrangement === "side-by-side"
            ? index === 0
              ? 240
              : 500
            : index === 0
              ? 60
              : 680;
        const isExpert = person.id === topic.expertId;
        const restingX = x + (index === 0 ? 22 : -22);
        const isOutgoing = person.id === input.topics[0].expertId;
        // The handoff keeps its cue spans: one hand lets go as the other takes
        // hold, and both finish as the second demonstration starts.
        const transfer =
          frame >= HANDOFF_CUE && frame <= SECOND_DEMONSTRATION_CUE;
        const contact = transfer
          ? isOutgoing
            ? 1 -
              ramp(
                frame,
                RELEASE_CUE,
                SECOND_DEMONSTRATION_CUE - RELEASE_CUE,
                motion.exit.easing,
              )
            : ramp(
                frame,
                HANDOFF_CUE,
                RELEASE_CUE - HANDOFF_CUE,
                motion.entrance.easing,
              )
          : isExpert
            ? reach
            : 0;
        const handX = mix(contact, restingX, toolX);
        const handY = mix(contact, 315, 325);
        return (
          <g
            key={person.id}
            data-person-id={person.id}
            opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
          >
            <LabelSlots
              labels={[
                [person.label, labelX, 95, 220, 20, 3],
                ...(input.showJobRoles
                  ? [
                      [person.roleLabel, labelX, 185, 220, 14, 3] as [
                        string,
                        number,
                        number,
                        number,
                        14,
                        number,
                      ],
                    ]
                  : []),
              ]}
            />
            <PersonGlyph x={x} y={290} size={72} color={accent} />
            <SketchedShape
              shape={{ kind: "path", d: `M${x} 290 L${handX} ${handY}` }}
              profile={tokens.sketch.shape}
              fill="none"
              stroke={isExpert ? accent : tokens.color.inactive}
              strokeWidth={scales.stroke(tokens.stroke.heavy)}
            />
            <circle
              data-transfer-hand={transfer ? "true" : undefined}
              data-demonstrating-hand={isExpert ? "true" : undefined}
              data-person-id={person.id}
              cx={handX}
              cy={handY}
              r={5}
              fill={accent}
            />
            <g opacity={motion.reveal(frame, DEMONSTRATE_CUE)}>
              <LabelSlots
                labels={[
                  [
                    isExpert ? input.labels.demonstrates : input.labels.learns,
                    index === 0 ? 60 : 680,
                    360,
                    220,
                    14,
                    4,
                  ],
                ]}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
