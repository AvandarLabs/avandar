import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RecordedInterval } from "../RecordedInterval";
import { SceneLabel } from "../SceneLabel";
import { OverlapBand } from "./OverlapBand";
import { type Props } from "./PresenceRibbonShared.types";
import type { ReactNode } from "react";
/** Unknown times never acquire a ribbon or a positive overlap. */
export function PresenceRibbon({
  record,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 215 + index * 45;
  const overlapStart = Math.max(
    record.start ?? 0,
    input.investigationWindow.start,
  );
  const overlapEnd = Math.min(record.end ?? 0, input.investigationWindow.end);
  const hasOverlap = record.start !== null && overlapStart < overlapEnd;
  const state =
    record.start === null ? "unknown" : hasOverlap ? "overlap" : "none";
  return (
    <g
      data-presence={record.id}
      data-state={state}
      opacity={motion.reveal(frame, 12 + index * motion.scaleStagger(2))}
    >
      <PersonGlyph x={45} y={y} size={28} color={accent} />
      <SceneLabel text={record.label} x={70} y={y - 3} width={195} lines={3} />
      <RecordedInterval record={record} axisEnd={input.axis.end} y={y} />
      {hasOverlap ? (
        <OverlapBand
          {...{ record, index, frame, accent, y }}
          start={overlapStart}
          end={overlapEnd}
          axisEnd={input.axis.end}
        />
      ) : undefined}
    </g>
  );
}
