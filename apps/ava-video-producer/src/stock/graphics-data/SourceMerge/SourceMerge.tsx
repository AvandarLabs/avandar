import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Destination } from "./Destination";
import { MergeNode } from "./MergeNode";
import { OutputEdge } from "./OutputEdge";
import { SourceMergeHeading } from "./SourceMergeHeading";
import type { Props } from "./SourceMerge.types";
import type { ReactNode } from "react";

/** Renders SourceMerge within the authored stock graphics. */
export function SourceMerge({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SourceMergeHeading {...{ input, frame, accent, tokens }} />
      <OutputEdge
        frame={frame}
        accent={accent}
        showPackets={input.showPackets}
      />
      <MergeNode frame={frame} accent={accent} />
      <Destination input={input} frame={frame} accent={accent} />
      <Text
        role="pill"
        x={GRAPHIC_WIDTH - tokens.layout.graphic.margin}
        y={552}
        anchor="end"
      >
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].conceptualDataFlow,
        })}
      </Text>
    </g>
  );
}
