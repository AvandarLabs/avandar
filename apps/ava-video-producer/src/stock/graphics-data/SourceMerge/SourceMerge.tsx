import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { Destination } from "./Destination";
import { MergeNode } from "./MergeNode";
import { OutputEdge } from "./OutputEdge";
import { SourceRow } from "./SourceRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: SourceMergeInput };

/** Draws the bounded authored source-merge study at an explicit frame. */
export function SourceMerge({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].unifyTheInputs,
        })}
      </Eyebrow>
      {input.sources.map((source, index) => (
        <SourceRow
          key={source.name}
          source={source}
          index={index}
          frame={frame}
          color={
            index === 1
              ? accent
              : getContentColorFromValue(source.color, { tokens, accent })
          }
          showPackets={input.showPackets}
        />
      ))}
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
