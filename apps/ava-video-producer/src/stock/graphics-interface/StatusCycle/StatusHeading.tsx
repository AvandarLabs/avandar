import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Pill } from "../../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the status heading layer for StatusCycle. */
export function StatusHeading(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].statusCycle,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].exampleState,
        })}
        color={props.accent}
      />
    </>
  );
}
