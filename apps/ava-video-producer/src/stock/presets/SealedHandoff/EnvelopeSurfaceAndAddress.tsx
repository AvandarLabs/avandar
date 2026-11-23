import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { EnvelopeFlaps } from "./EnvelopeFlaps/EnvelopeFlaps";
import { ExteriorAddress } from "./ExteriorAddress";
import { HandoffBrief } from "./HandoffBrief/HandoffBrief";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";

/** Complete brief, exterior address and recipient-reveal policy. */
export type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the envelope surface and address in authored paint order. */
export function EnvelopeSurfaceAndAddress(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={0}
        y={0}
        width={536}
        height={266}
        rx={options.scales.corner(3)}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M0 0 L268 -84 L536 0" }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      <HandoffBrief {...{ frame: options.frame, input: options.input }} />
      <EnvelopeFlaps
        {...{
          frame: options.frame,
          input: options.input,
          accent: options.accent,
        }}
      />
      <ExteriorAddress {...{ frame: options.frame, input: options.input }} />
    </>
  );
}
