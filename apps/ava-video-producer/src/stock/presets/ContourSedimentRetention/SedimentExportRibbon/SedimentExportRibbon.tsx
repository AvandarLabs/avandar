import { Motion } from "../../../../motion";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  bypass: number;
  outflow: number;
  settle: number;
  exportedWidth: number;
};
/** Carries exported sediment through the bypass and exit cues. */
export function SedimentExportRibbon({
  frame,
  tokens,
  bypass,
  outflow,
  settle,
  exportedWidth,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <rect
        data-exported-ribbon="physical"
        x={
          frame < 70
            ? Motion.mix({ t: bypass, from: 300, to: 350 })
            : Motion.mix({ t: outflow, from: 350, to: 770 })
        }
        y={
          frame < 70
            ? Motion.mix({ t: bypass, from: 238, to: 350 })
            : Motion.mix({ t: outflow, from: 350, to: 365 })
        }
        width={exportedWidth}
        height={Motion.mix({ t: settle, from: 8, to: 24 })}
        fill={tokens.color.highlight}
      />
    </>
  );
}
