import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Storage fill uses the actual finite capacity and event-volume scale. */
export function StorageBasin({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const incoming = input.event.incomingM3;
  const detained = Math.min(
    input.detentionCapacityM3,
    incoming - (input.event.infiltratedM3 + input.event.dischargedM3),
  );
  const height =
    (detained / incoming) *
    140 *
    motion.ramp(frame, 48, motion.scale(36), motion.travel.easing);
  const lip = 380 - Math.min(input.detentionCapacityM3 / incoming, 1) * 140;
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M40 230H340V380H620V230H920" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <rect
        data-water="detention"
        x={340}
        y={380 - height}
        width={280}
        height={height}
        fill={tokens.color.categorical[WATER_DESTINATIONS.detained.category]}
        fillOpacity={tokens.alpha.dimmed}
      />
      <g data-lip="capacity">
        <SketchedShape
          shape={{ kind: "path", d: `M330 ${lip}H630` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeDasharray={tokens.dash.pending.join(" ")}
        />
      </g>
    </g>
  );
}
