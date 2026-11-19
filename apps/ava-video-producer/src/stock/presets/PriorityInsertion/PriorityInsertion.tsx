import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PriorityQueueItem } from "./PriorityQueueItem";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Open exactly one queue slot and insert authored work from a side spur. */
export function PriorityInsertion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const insertion = input.queue.findIndex(propEq("id", input.insertBeforeId));
  const shift = motion.ramp(frame, 64, motion.scale(44), motion.travel.easing);
  const incoming = motion.ramp(
    frame,
    120,
    motion.scale(12),
    motion.travel.easing,
  );
  const spur = motion.ramp(frame, 108, motion.scale(12), motion.travel.easing);
  const insertionY = 190 + 58 * insertion;
  return (
    <g>
      <g opacity={motion.ramp(frame, 12, motion.scale(26))}>
        <FitText
          text={input.serviceLabel}
          x={100}
          y={108}
          width={400}
          fontSize={20}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
          color={accent}
        />
        <SketchedShape
          shape={{
            kind: "path",
            d: "M80 160 l-6 10 M80 160 l6 10 M80 160 V532",
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          fill="none"
        />
        {Array.from({ length: input.queue.length + 1 }, (_, index) => {
          return (
            <g key={index}>
              <FitText
                text={String(index + 1)}
                x={65}
                y={218 + 58 * index}
                width={30}
                fontSize={14}
                maxLines={1}
                normalizeWhitespace
                anchor="end"
                color={tokens.color.textMuted}
              />
              {input.showOriginalPositions && index < input.queue.length ? (
                <StockRect
                  data-original-slot={index}
                  x={96}
                  y={186 + 58 * index}
                  width={368}
                  height={56}
                  rx={scales.corner(tokens.corner.cell)}
                  fill="none"
                  stroke={tokens.color.line}
                  strokeDasharray="3 6"
                />
              ) : undefined}
            </g>
          );
        })}
      </g>
      <g opacity={motion.ramp(frame, 38, motion.scale(26))}>
        <SketchedShape
          shape={{ kind: "path", d: `M760 300 V${insertionY + 24} H460` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          fill="none"
          strokeDasharray="5 8"
        />
        <FitText
          text={input.priorityLabel}
          x={590}
          y={100}
          width={340}
          fontSize={18}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
          color={tokens.color.highlight}
        />
      </g>
      {input.queue.map((item, index) => {
        return (
          <PriorityQueueItem
            key={item.id}
            item={item}
            x={100}
            y={190 + 58 * (index + (index >= insertion ? shift : 0))}
            accent={accent}
            opacity={motion.ramp(frame, 12 + index * 2, motion.hero)}
          />
        );
      })}
      <PriorityQueueItem
        item={input.incomingItem}
        x={mix(incoming, 580, 100)}
        y={mix(spur, 276, insertionY)}
        accent={accent}
        opacity={motion.ramp(frame, 38, motion.scale(26))}
        isIncoming
      />
    </g>
  );
}
