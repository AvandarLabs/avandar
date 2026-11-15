import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { WeaveBandPattern } from "./WeaveBandPattern";
import { WeaveCaptions } from "./WeaveCaptions";
import { WeaveShuttle } from "./WeaveShuttle";
import { WeaveWarp } from "./WeaveWarp";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ContributionWeave.schema";
import type { ComponentProps, ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const LOOM = {
  x: 320,
  y: 180,
  width: 550,
  height: 300,
  rx: 6,
  fill: STOCK.surface,
  stroke: STOCK.line,
  strokeWidth: 5,
} satisfies Pick<
  ComponentProps<"rect">,
  "x" | "y" | "width" | "height" | "rx" | "fill" | "stroke" | "strokeWidth"
>;
/** Distinct bands interlock by alternating visible crossing ownership. */
export function ContributionWeave({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const colors = [accent, STOCK.cyan, STOCK.orange];
  const warpProps = { numWarp: input.warp.length, input, frame, id };
  const shuttleProps = { input, frame, id };
  return (
    <g>
      <rect {...LOOM} opacity={ramp(frame, 12, 12)} />
      <defs>
        {[...input.warp, ...input.weft].map((contributor, index) => (
          <WeaveBandPattern
            key={contributor.id}
            id={`${id}-band-${index}`}
            color={colors[index % 3]}
            pattern={contributor.pattern}
          />
        ))}
      </defs>
      {input.warp.map((contributor, index) => (
        <WeaveWarp
          key={contributor.id}
          contributor={contributor}
          index={index}
          {...warpProps}
        />
      ))}
      {input.weft.map((contributor, index) => (
        <WeaveShuttle
          key={contributor.id}
          contributor={contributor}
          index={index}
          {...shuttleProps}
        />
      ))}
      {input.showLabels ? <WeaveCaptions copy={input.copy} /> : undefined}
    </g>
  );
}
