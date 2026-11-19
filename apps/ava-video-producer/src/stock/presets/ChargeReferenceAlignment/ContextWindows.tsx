import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CONTEXT_FIELDS } from "./CONTEXT_FIELDS.constants";
import { ContextWindow } from "./ContextWindow";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Exact key windows register while unmatched values keep an offset notch. */
export function ContextWindows({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const registration = motion.ramp(
    frame,
    12,
    motion.scale(58),
    motion.travel.easing,
  );
  return (
    <g>
      {CONTEXT_FIELDS.map(([field, copyKey], index) => {
        return (
          <ContextWindow
            key={field}
            {...{ input, field, copyKey, index, registration, accent }}
          />
        );
      })}
    </g>
  );
}
