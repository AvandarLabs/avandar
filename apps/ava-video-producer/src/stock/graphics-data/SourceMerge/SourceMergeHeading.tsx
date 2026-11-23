import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { SourceRow } from "./SourceRow";
import type { SourceMergeHeadingData } from "./SourceMerge.types";
import type { ReactNode } from "react";

type Props = SourceMergeHeadingData;

/** Renders the source merge heading layer for SourceMerge. */
export function SourceMergeHeading(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].unifyTheInputs,
        })}
      </Eyebrow>
      {options.input.sources.map((source, index) => {
        return (
          <SourceRow
            key={source.name}
            source={source}
            index={index}
            frame={options.frame}
            color={
              index === 1
                ? options.accent
                : getContentColorFromValue({
                    value: source.color,
                    options: { tokens: options.tokens, accent: options.accent },
                  })
            }
            showPackets={options.input.showPackets}
          />
        );
      })}
    </>
  );
}
