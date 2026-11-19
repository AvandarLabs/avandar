import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AperturePanel } from "./AperturePanel";
import { DisclosureCopies } from "./DisclosureCopies";
import { DisclosureCopy } from "./DisclosureCopy";
import { DisclosureField } from "./DisclosureField";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";
/** Complete authored disclosure policy and source content. */
export type Props = GraphicProps & { input: Input };
/**
 * The original document stays complete while only explicitly shared duplicates
 * leave.
 */
export function DisclosureAperture({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const destinationX = input.direction === "left-to-right" ? 540 : 60;
  return (
    <g data-disclosure-direction={input.direction}>
      <StockRect
        x={60}
        y={156}
        width={360}
        height={360}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <StockRect
        x={540}
        y={156}
        width={360}
        height={360}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${destinationX} 156 l180 42 l180 -42` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
      <AperturePanel {...{ frame, input, accent }} />
      {input.fields.map((field, index) => {
        return (
          <DisclosureField
            key={field.id}
            {...{ field, index, frame, input, accent }}
            shareIndex={0}
            isCopy={false}
          />
        );
      })}
      <DisclosureCopies {...{ input, frame, accent }} />
      <DisclosureCopy input={input} />
    </g>
  );
}
