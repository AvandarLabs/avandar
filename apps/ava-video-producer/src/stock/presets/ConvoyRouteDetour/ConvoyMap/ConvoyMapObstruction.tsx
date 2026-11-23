import { SketchedShape } from "../../../primitives/SketchedShape";
import { ConvoyLandmarks } from "../ConvoyLandmarks/ConvoyLandmarks";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ConvoyRouteDetour.schema";
import type { getConvoyRouteFromRole } from "../getConvoyRouteFromRole";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  start: ReturnType<typeof getConvoyRouteFromRole>["points"][number];
  end: ReturnType<typeof getConvoyRouteFromRole>["points"][number];
};

/** Renders the convoy map obstruction in authored paint order. */
export function ConvoyMapObstruction(options: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        data-obstruction={options.input.obstruction.kind}
        transform={`translate(${80 + (options.start.x + options.end.x) * 400} ${180 + (options.start.y + options.end.y) * 140})`}
      >
        <SketchedShape
          shape={{ kind: "path", d: "M-20 -17 L20 17 M-20 17 L20 -17" }}
          profile={options.tokens.sketch.shape}
          stroke={options.tokens.color.highlight}
          strokeWidth={options.scales.stroke(5)}
        />
        {options.input.obstruction.kind === "bridge-closure" ? (
          <SketchedShape
            shape={{ kind: "path", d: "M-28 -24 V24 M28 -24 V24" }}
            profile={options.tokens.sketch.shape}
            stroke={options.tokens.color.highlight}
            strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
          />
        ) : undefined}
      </g>
      <ConvoyLandmarks
        input={options.input}
        frame={options.frame}
        accent={options.accent}
      />
    </>
  );
}
