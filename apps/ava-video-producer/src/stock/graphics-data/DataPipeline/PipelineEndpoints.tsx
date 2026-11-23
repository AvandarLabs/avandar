import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { FOOTER_Y } from "./DataPipeline.constants";
import type { Drawing } from "./DataPipeline.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the pipeline endpoints layer for DataPipeline. */
export function PipelineEndpoints(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="meta" x={props.margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].input,
        })}
      </Text>
      <Text
        role="meta"
        x={props.margin + props.trackWidth}
        y={FOOTER_Y}
        fill={props.accent}
        anchor="end"
      >
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].output,
        })}
      </Text>
    </>
  );
}
