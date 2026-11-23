import { SceneLabel } from "../SceneLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  frame: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the ledger with authored geometry. */
export function CustodyLegendLedger({
  input,
  motion,
  frame,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showLedger ? (
        <g
          data-ledger="custody"
          opacity={motion.ramp(frame, 116, motion.scale(10))}
        >
          <SceneLabel
            text={input.copy.total}
            x={32}
            y={562}
            width={280}
            lines={3}
          />
          <text
            x={315}
            y={562}
            fill={tokens.color.text}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontWeight={tokens.text.graphic.value.fontWeight}
            fontSize={tokens.text.graphic.value.fontSize}
          >
            {input.crates.length}
          </text>
        </g>
      ) : undefined}
    </>
  );
}
