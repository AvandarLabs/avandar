import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RulerEndLabel } from "./RulerEndLabel";
import type { Input } from "../TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** One ruler and color legend belong equally to both independent periods. */
export function RevenueLegend({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {" "}
      <SketchedShape
        shape={{ kind: "path", d: "M80 463 V450 H420 V463 M250 450 V458" }}
        profile={tokens.sketch.shape}
        data-common-ruler="true"
        stroke={tokens.color.inactive}
        fill="none"
      />
      <RulerEndLabel x={80}>0</RulerEndLabel>
      <RulerEndLabel x={420} anchor="end">
        {input.periods[0].receiptsMinor / input.money.minorUnitsPerUnit}
      </RulerEndLabel>
      {[input.copy.operating, input.copy.distribution, input.copy.retained].map(
        (label, index) => {
          return (
            <g key={index}>
              <rect
                x={60 + index * 290}
                y={500}
                width={12}
                height={12}
                fill={
                  [tokens.color.accentAlt, tokens.color.highlight, accent][
                    index
                  ]
                }
              />
              <LabelSlots
                labels={[[label, 80 + index * 290, 511, 260, 12, 3]]}
              />
            </g>
          );
        },
      )}
    </g>
  );
}
