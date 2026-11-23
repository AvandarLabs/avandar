import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useSatchelBagPresentation } from "./useSatchelBagPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSatchelBagPresentation>,
  "opening" | "tokens" | "accent" | "scales"
>;
/** Render the satchel flap. */
export function SatchelFlap(props: Readonly<Props>): ReactNode {
  return (
    <g data-satchel-flap="true">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M263 253 L263 ${Motion.mix({
            t: props.opening,
            from: 270,
            to: 226,
          })} Q286 ${Motion.mix({ t: props.opening, from: 277, to: 214 })} 309 ${Motion.mix(
            {
              t: props.opening,
              from: 270,
              to: 226,
            },
          )} L309 253`,
        }}
        profile={props.tokens.sketch.shape}
        fill={props.tokens.color.surface}
        stroke={props.accent}
        strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
      />
    </g>
  );
}
