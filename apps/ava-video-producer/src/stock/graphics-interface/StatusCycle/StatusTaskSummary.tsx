import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the status task summary layer for StatusCycle. */
export function StatusTaskSummary(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="footnote" x={212} y={408}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].sampleTask,
        })}
      </Text>
      <Text role="footnote" x={748} y={408} anchor="end" fill={props.accent}>
        {Math.round(props.progress * 100)}%
      </Text>
    </>
  );
}
