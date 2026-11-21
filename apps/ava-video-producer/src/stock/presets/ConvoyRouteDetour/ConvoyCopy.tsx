import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ConvoyCaptionSlots } from "./ConvoyCaptionSlots/ConvoyCaptionSlots";
import { ConvoyRouteLabels } from "./ConvoyRouteLabels/ConvoyRouteLabels";
import type { FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Fixed label rails stay outside the complete authored road region. */
export function ConvoyCopy({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const labels: Array<[string, number, number, number, FitTextSize, string]> = [
    [input.scenarioCaption, 40, 38, 880, 16, tokens.color.text],
    [input.locations.depotLabel, 65, 95, 245, 14, tokens.color.text],
    [input.locations.destinationLabel, 365, 95, 245, 14, tokens.color.text],
    [input.locations.junctionLabel, 665, 95, 245, 14, tokens.color.text],
    [input.obstruction.label, 40, 505, 280, 14, tokens.color.highlight],
  ];
  return (
    <g>
      <ConvoyCaptionSlots labels={labels} />
      {[0, 1, 2].map((index) => {
        return (
          <text
            key={index}
            x={40 + index * 300}
            y={95}
            fill={tokens.color.accentAlt}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontWeight={tokens.text.graphic.value.fontWeight}
            fontSize={tokens.text.graphic.value.fontSize}
          >
            {index + 1}
          </text>
        );
      })}
      <ConvoyRouteLabels {...{ input, accent, tokens }} />
    </g>
  );
}
