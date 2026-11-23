import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  service: Input["services"][number];
  x: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the outline with authored geometry. */
export function ServiceEntranceSymbol({
  service,
  x,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {service.symbol === "shelter" ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${x - 18} 184 L${x} 168 L${x + 18} 184` }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
        />
      ) : service.symbol === "water" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} 163 Q${x - 20} 187 ${x} 190 Q${x + 20} 187 ${x} 163`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
        />
      ) : (
        <g fill={tokens.color.inactive}>
          <circle cx={x} cy={171} r={2} />
          <rect x={x - 1} y={178} width={2} height={12} />
        </g>
      )}
    </>
  );
}
