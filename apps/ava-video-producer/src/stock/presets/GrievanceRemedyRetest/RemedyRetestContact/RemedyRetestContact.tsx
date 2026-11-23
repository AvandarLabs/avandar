import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  functioning: number;
  attempt: number;
  isLamp: boolean;
};
/** Shows the repaired object test contact and functioning state. */
export function RemedyRetestContact({
  accent,
  tokens,
  scales,
  functioning,
  attempt,
  isLamp,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M560 330 l${isLamp ? 12 : 14} ${Motion.mix({ t: functioning, from: 12, to: 0 }) - attempt}`,
        }}
        profile={tokens.sketch.shape}
        data-object-operation="handle"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </>
  );
}
