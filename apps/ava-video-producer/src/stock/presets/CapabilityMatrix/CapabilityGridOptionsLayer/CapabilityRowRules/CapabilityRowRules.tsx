import { SketchedShape } from "../../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  input: Input;
};
/** Draws the shared row separators under the capability options. */
export function CapabilityRowRules({
  tokens,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.capabilities.map((row, index) => {
        return (
          <SketchedShape
            key={row.id}
            shape={{
              kind: "line",
              x1: 54,
              x2: 908,
              y1: 176 + index * 66,
              y2: 176 + index * 66,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
          />
        );
      })}
    </>
  );
}
