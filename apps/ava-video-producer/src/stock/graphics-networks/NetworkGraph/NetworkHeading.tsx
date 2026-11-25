import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Pill } from "../../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { COUNT_PILL_TOP, COUNT_PILL_WIDTH } from "./NetworkGraph.constants";
import type { NetworkHeadingData } from "./NetworkGraph.types";
import type { ReactNode } from "react";

type Props = NetworkHeadingData;

/** Renders the network heading layer for NetworkGraph. */
export function NetworkHeading(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].relationshipNetwork,
        })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - options.layout.graphic.margin - COUNT_PILL_WIDTH}
        y={COUNT_PILL_TOP}
        width={COUNT_PILL_WIDTH}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].nodeCount,
          values: {
            count: String(options.input.nodes.length).padStart(2, "0"),
          },
        })}
        color={options.accent}
      />
    </>
  );
}
