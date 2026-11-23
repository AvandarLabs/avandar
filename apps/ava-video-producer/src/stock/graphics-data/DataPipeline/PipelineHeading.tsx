import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { HEADING_Y } from "./DataPipeline.constants";
import type { Drawing } from "./DataPipeline.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the pipeline heading layer for DataPipeline. */
export function PipelineHeading(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].dataPipeline,
        })}
      </Eyebrow>
      <Text role="display" x={props.margin} y={HEADING_Y}>
        {props.input.heading}
      </Text>
    </>
  );
}
