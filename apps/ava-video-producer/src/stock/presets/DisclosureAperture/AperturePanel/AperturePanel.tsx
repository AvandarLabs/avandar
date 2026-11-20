import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getCrossingFromShareIndex } from "../getCrossingFromShareIndex";
import { OpenAperture } from "./OpenAperture";
import type { Input } from "../DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Each opening exists only opposite an actively passing authored share field.
 */
export function AperturePanel({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  let numSharedFields = 0;
  return (
    <g>
      <StockRect
        x={452}
        y={156}
        width={56}
        height={360}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      {input.fields.map((field, index) => {
        if (field.disclosure !== "share") {
          return undefined;
        }
        const crossing = getCrossingFromShareIndex({
          shareIndex: numSharedFields++,
          motion,
        });
        if (frame < crossing.at || frame >= crossing.at + crossing.duration) {
          return undefined;
        }
        return (
          <OpenAperture
            key={field.id}
            fieldId={field.id}
            index={index}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
