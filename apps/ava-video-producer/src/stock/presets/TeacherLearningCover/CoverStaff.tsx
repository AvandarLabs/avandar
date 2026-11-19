import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneText } from "./SceneText";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";

type Props = {
  role: keyof Input["staff"];
  person: Input["staff"]["teacher"];
  x: number;
  frame: number;
  mode: Input["session"]["mode"];
  accent: string;
};
/**
 * Stable adult identity and frame-driven rehearsal or planning hand contact.
 */
export function CoverStaff({
  role,
  person,
  x,
  frame,
  mode,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const practicing = frame >= 72 && frame <= 104;
  const gesture =
    mode === "rehearsal"
      ? Math.sin(
          motion.ramp(frame, 72, motion.scale(32), motion.entrance.easing) *
            Math.PI *
            2,
        ) * 15
      : motion.ramp(frame, 72, motion.scale(32), motion.entrance.easing) * 28;
  const handX = role === "teacher" ? 700 + gesture : 810 - gesture;
  return (
    <g>
      <SceneText
        text={person.label}
        anchor="middle"
        slot={[role === "cover" ? 175 : x, 150, 170, 14, 3]}
      />
      <g
        data-staff-role={role}
        data-staff-id={person.id}
        transform={`translate(${x} 250)`}
      >
        <PersonGlyph
          x={0}
          y={0}
          size={56}
          color={
            role === "teacher"
              ? accent
              : role === "cover"
                ? tokens.color.accentAlt
                : tokens.color.highlight
          }
        />
        {practicing && role !== "cover" ? (
          <g data-teaching-hand={role}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M0 0 L${(handX - x) / 2} 25 L${handX - x} 50`,
              }}
              profile={tokens.sketch.shape}
              fill="none"
              stroke={role === "teacher" ? accent : tokens.color.highlight}
              strokeWidth={scales.stroke(tokens.stroke.emphasis)}
              strokeLinecap="round"
            />
          </g>
        ) : undefined}
      </g>
    </g>
  );
}
