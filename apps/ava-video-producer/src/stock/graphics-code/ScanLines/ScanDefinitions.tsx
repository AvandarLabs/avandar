import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { ScanDefinitionsData } from "./ScanLines.types";
import type { ReactNode } from "react";

type Props = ScanDefinitionsData;

/** Renders the scan definitions layer for ScanLines. */
export function ScanDefinitions(options: Readonly<Props>): ReactNode {
  return (
    <>
      <defs>
        <linearGradient id={`${options.id}-scan`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={options.accent} stopOpacity="0" />
          <stop
            offset="1"
            stopColor={options.accent}
            stopOpacity={options.shapes.wash(options.atomic.opacity["12"])}
          />
        </linearGradient>
        <clipPath id={`${options.id}-scan-clip`}>
          <rect
            x={153}
            y={142}
            width={691}
            height={344}
            rx={options.shapes.corner(options.corner.card)}
          />
        </clipPath>
      </defs>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].scanningPass,
        })}
      </Eyebrow>
    </>
  );
}
