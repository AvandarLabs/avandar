import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SchoolLocker } from "./SchoolLocker";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

/** A floor mark's horizontal radius. */
const FLOOR_MARK_RADIUS_X = 7;
/** A floor mark's vertical radius. */
const FLOOR_MARK_RADIUS_Y = 3;
type Props = {
  input: Input;
  doorWidth: number;
  accent: string;
  finalStep: number;
};
/**
 * Locker opens onto a dark interior while the classroom remains a practice
 * stop.
 */
export function PracticeInterior({
  input,
  doorWidth,
  accent,
  finalStep,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M48 410 H912 M48 410 V200 M912 410 V200" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
      <SchoolLocker input={input} doorWidth={doorWidth} accent={accent} />{" "}
      <g data-classroom={input.stops[1].id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: "M710 410 V235 H830 V410 M718 410 V243 H822 V410",
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          fill="none"
        />
      </g>
      {input.showFootprints ? (
        <g opacity={tokens.alpha.ghost * finalStep} fill={accent}>
          {Array.from({ length: 7 }, (_, index) => {
            return (
              <ellipse
                key={index}
                cx={410 + index * 45}
                cy={420 + (index % 2) * 7}
                rx={FLOOR_MARK_RADIUS_X}
                ry={FLOOR_MARK_RADIUS_Y}
              />
            );
          })}
        </g>
      ) : undefined}
      <LabelSlots
        labels={[
          [input.stops[0].label, 290, 190, 290, 14, 3],
          [input.stops[1].label, 650, 190, 260, 14, 3],
        ]}
      />
    </g>
  );
}
