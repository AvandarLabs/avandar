import { SketchedShape } from "../../../../primitives/SketchedShape";
import type { Motion } from "../../../../../motion";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["people"][number];
  x: number;
  accent: string;
  handX: ReturnType<typeof Motion.mix>;
  handY: ReturnType<typeof Motion.mix>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  isExpert: boolean;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  transfer: boolean;
};
/** Shows the expert arm and hand during demonstration or transfer. */
export function ExpertiseToolContact({
  person,
  x,
  accent,
  handX,
  handY,
  tokens,
  isExpert,
  scales,
  transfer,
}: Readonly<Props>): ReactNode {
  return (
    <>
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
    </>
  );
}
