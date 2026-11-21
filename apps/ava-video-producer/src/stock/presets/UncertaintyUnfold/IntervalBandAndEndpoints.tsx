import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  unfold: number;
  left: number;
  right: number;
  patternId: string;
};

/** Renders the interval band and endpoints in authored paint order. */
export function IntervalBandAndEndpoints(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        data-interval-band="true"
        x={options.left}
        y={278}
        width={options.right - options.left}
        height={44}
        fill={`url(#${options.patternId})`}
        stroke={options.accent}
        strokeOpacity={options.unfold}
      />
      <SketchedShape
        shape={{
          kind: "line",
          x1: options.left,
          y1: 270,
          x2: options.left,
          y2: 330,
        }}
        profile={options.tokens.sketch.shape}
        data-lower-endpoint="true"
        stroke={options.accent}
        opacity={options.unfold}
      />
      <SketchedShape
        shape={{
          kind: "line",
          x1: options.right,
          y1: 270,
          x2: options.right,
          y2: 330,
        }}
        profile={options.tokens.sketch.shape}
        data-upper-endpoint="true"
        stroke={options.accent}
        opacity={options.unfold}
      />
    </>
  );
}
