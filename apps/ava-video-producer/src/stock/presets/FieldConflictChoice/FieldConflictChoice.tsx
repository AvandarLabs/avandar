import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ConflictField } from "./ConflictField";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };

/** Frames the whole record takes to fade in. */
const INTRO_FRAMES = 20;
/**
 * Authored source choices travel into result lanes without silent resolution.
 */
export function FieldConflictChoice({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g
      opacity={ramp(
        frame,
        12,
        motion.scale(INTRO_FRAMES),
        motion.reveal.easing,
      )}
    >
      <FitText
        text={input.recordTitle}
        x={44}
        y={52}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      {input.fields.map((field, index) => {
        return (
          <ConflictField
            key={field.id}
            frame={frame}
            accent={accent}
            input={input}
            field={field}
            index={index}
          />
        );
      })}
    </g>
  );
}
