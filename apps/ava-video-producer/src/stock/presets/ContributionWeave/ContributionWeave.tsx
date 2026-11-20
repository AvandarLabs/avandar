import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WeaveBandPattern } from "./WeaveBandPattern";
import { WeaveCaptions } from "./WeaveCaptions";
import { WeaveShuttle } from "./WeaveShuttle";
import { WeaveWarp } from "./WeaveWarp";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ContributionWeave.schema";
import type { ComponentProps, ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const LOOM = { x: 320, y: 180, width: 550, height: 300 } satisfies Pick<
  ComponentProps<"rect">,
  "x" | "y" | "width" | "height"
>;
/** The loom frame's corner before the corner style scales it. */
const LOOM_CORNER = 6;
/** The loom frame's line weight before the line weight scales it. */
const LOOM_STROKE = 5;
/** Distinct bands interlock by alternating visible crossing ownership. */
export function ContributionWeave({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const colors = [accent, tokens.color.accentAlt, tokens.color.highlight];
  const warpProps = { numWarp: input.warp.length, input, frame, id };
  const shuttleProps = { input, frame, id };
  return (
    <g>
      <StockRect
        {...LOOM}
        rx={scales.corner(LOOM_CORNER)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(LOOM_STROKE)}
        opacity={motion.reveal(frame, 12)}
      />
      <defs>
        {[...input.warp, ...input.weft].map((contributor, index) => {
          return (
            <WeaveBandPattern
              key={contributor.id}
              id={`${id}-band-${index}`}
              color={colors[index % 3]}
              pattern={contributor.pattern}
            />
          );
        })}
      </defs>
      {input.warp.map((contributor, index) => {
        return (
          <WeaveWarp
            key={contributor.id}
            contributor={contributor}
            index={index}
            {...warpProps}
          />
        );
      })}
      {input.weft.map((contributor, index) => {
        return (
          <WeaveShuttle
            key={contributor.id}
            contributor={contributor}
            index={index}
            {...shuttleProps}
          />
        );
      })}
      {input.showLabels ? <WeaveCaptions copy={input.copy} /> : undefined}
    </g>
  );
}
