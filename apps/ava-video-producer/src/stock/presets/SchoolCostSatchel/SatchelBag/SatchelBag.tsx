import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { SatchelFlap } from "./SatchelFlap";
import { useSatchelBagPresentation } from "./useSatchelBagPresentation";
import type { ReactNode } from "react";

type Props = { opening: number; accent: string };
/** Draws the scene's SatchelBag group with fixed authored geometry. */
export function SatchelBag(props: Readonly<Props>): ReactNode {
  const presentation = useSatchelBagPresentation(props);

  return (
    <>
      <g data-satchel-hand="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M245 240 L263 250 L275 ${Motion.mix({
              t: props.opening,
              from: 254,
              to: 231,
            })}`,
          }}
          profile={presentation.tokens.sketch.shape}
          fill="none"
          stroke={props.accent}
          strokeWidth={presentation.scales.stroke(
            presentation.tokens.stroke.emphasis,
          )}
          strokeLinecap="round"
        />
      </g>
      <StockRect
        x={263}
        y={253}
        width={46}
        height={43}
        rx={presentation.scales.corner(7)}
        fill={presentation.tokens.color.surface}
        stroke={props.accent}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.default,
        )}
      />
      <SatchelFlap {...presentation} />
    </>
  );
}
