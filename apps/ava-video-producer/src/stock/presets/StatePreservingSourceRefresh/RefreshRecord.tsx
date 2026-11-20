import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Source labels change independently from the pinned human-state region. */
export function RefreshRecord({
  input,
  record,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const source = input.sourceRows.find(({ id }) => {
      return id === record.id;
    }),
    y = 112 + index * 106;
  const refresh = motion.ramp(
      frame,
      105,
      motion.scale(34),
      motion.travel.easing,
    ),
    isApplied = refresh === 1;
  const label = isApplied && source ? source.label : record.label,
    missing = isApplied && !source;
  const isChanged = source?.label !== record.label;
  return (
    <g
      data-record-row={record.id}
      data-label={label}
      data-status={record.status}
      data-assignee={record.assignee}
      data-missing={missing}
    >
      <StockRect
        x={50}
        y={y}
        width={860}
        height={98}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <LiteralDataText value={record.id} x={65} y={y + 28} />
      <g opacity={source && isChanged ? 1 - refresh : 1}>
        <LabelSlots labels={[[record.label, 220, y + 22, 350, 12, 1]]} />
      </g>
      {source && isChanged && frame >= 51 ? (
        <g opacity={motion.reveal(frame, 51)}>
          <LabelSlots
            labels={[
              [source.label, 220, mix(refresh, y + 61, y + 22), 350, 12, 1],
            ]}
          />
        </g>
      ) : null}
      {isApplied ? (
        <LabelSlots
          labels={[
            [
              !source
                ? input.labels.missing
                : !isChanged
                  ? input.labels.unchanged
                  : "",
              220,
              y + 56,
              350,
              12,
              3,
            ],
          ]}
        />
      ) : null}
      <StockRect
        data-human-pin={record.id}
        x={610}
        y={y + 5}
        width={290}
        height={88}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.elevated}
        stroke={accent}
        strokeOpacity={motion.ramp(frame, 13, motion.scale(37))}
      />
      <LabelSlots
        labels={[
          [record.status, 625, y + 19, 125, 12, 5],
          [record.assignee, 765, y + 19, 125, 12, 5],
        ]}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M598 ${y + 5} V${y + 93}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
