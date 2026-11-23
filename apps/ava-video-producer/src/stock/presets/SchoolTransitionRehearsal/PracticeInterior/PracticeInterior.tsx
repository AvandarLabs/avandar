import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SchoolLocker } from "../SchoolLocker";
import { Footprints } from "./Footprints";
import type { Input } from "../SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

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
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
        <Footprints finalStep={finalStep} accent={accent} />
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
