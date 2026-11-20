import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
/** Inputs for WorkshopCaptions. */
type Props = { input: Input };
/** Captions stay outside actor travel, with a guide to the agreed strip row. */
export function WorkshopCaptions({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const unresolved: Array<[string, number, number, number, 14, number]> =
    input.requests.some(propEq("agreedSlotId", null))
      ? [[input.labels.unresolved, 390, 360, 540, 14, 2]]
      : [];
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.example, 48, 40, 864, 16, 2],
          [input.labels.requested, 390, 96, 540, 14, 2],
          [input.labels.agreed, 48, 304, 280, 14, 3],
          ...unresolved,
        ]}
      />
      <g data-agreed-caption-guide="">
        <SketchedShape
          shape={{
            kind: "path",
            d: "M330 320 H354 V480 H384 M379 476 L384 480 L379 484",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.outline)}
        />
      </g>
    </g>
  );
}
