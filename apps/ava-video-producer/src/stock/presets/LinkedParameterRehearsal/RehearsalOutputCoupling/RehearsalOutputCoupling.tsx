import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  output: Input["outputs"][number];
  sourceX: number;
  index: number;
  y: number;
  pointerX: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the coupling id with authored geometry. */
export function RehearsalOutputCoupling({
  output,
  sourceX,
  index,
  y,
  pointerX,
  tokens,
  accent,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {output.multiplier !== 0 ? (
        <g data-coupling-id={output.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${sourceX} 170 V${192 + index * 5} H${348 + index * 6} V${y} H${pointerX}`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeOpacity={atomic.opacity["24"]}
          />
        </g>
      ) : undefined}
    </>
  );
}
