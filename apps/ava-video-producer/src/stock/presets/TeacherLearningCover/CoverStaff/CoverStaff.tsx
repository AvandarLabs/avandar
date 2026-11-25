import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SceneText } from "../SceneText";
import { TeachingHand } from "./TeachingHand";
import { useCoverStaffPresentation } from "./useCoverStaffPresentation";
import type { Input } from "../TeacherLearningCover.schema.ts";
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
export function CoverStaff(props: Readonly<Props>): ReactNode {
  const presentation = useCoverStaffPresentation(props);

  return (
    <g>
      <SceneText
        text={props.person.label}
        anchor="middle"
        slot={[props.role === "cover" ? 175 : props.x, 150, 170, 14, 3]}
      />
      <g
        data-staff-role={props.role}
        data-staff-id={props.person.id}
        transform={`translate(${props.x} 250)`}
      >
        <PersonGlyph
          x={0}
          y={0}
          size={56}
          color={
            props.role === "teacher"
              ? props.accent
              : props.role === "cover"
                ? presentation.tokens.color.accentAlt
                : presentation.tokens.color.highlight
          }
        />
        {presentation.practicing && props.role !== "cover" ? (
          <TeachingHand {...presentation} />
        ) : undefined}
      </g>
    </g>
  );
}
