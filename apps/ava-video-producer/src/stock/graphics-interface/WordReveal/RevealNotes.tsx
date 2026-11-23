import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { RULE_AT, NOTES_AT } from "./WordReveal.constants";
import type { Drawing } from "./WordReveal.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the reveal notes layer for WordReveal. */
export function RevealNotes(props: Readonly<Props>): ReactNode {
  return (
    <>
      <rect
        x={80}
        y={452}
        width={745 * props.motion.ramp(props.frame, RULE_AT, props.motion.hero)}
        height={2}
        fill={props.color.line}
      />
      <g opacity={props.motion.ramp(props.frame, NOTES_AT, props.motion.sheet)}>
        <Text role="label" x={80} y={506} fill={props.color.textMuted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"]
                .kineticTypographyOneWordAtATime,
          })}
        </Text>
        <Text role="detail" x={80} y={550}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"].translationMaskFixedTypeSize,
          })}
        </Text>
      </g>
    </>
  );
}
