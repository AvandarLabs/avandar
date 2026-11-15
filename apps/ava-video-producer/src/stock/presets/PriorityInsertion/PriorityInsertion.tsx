import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { PriorityQueueItem } from "./PriorityQueueItem";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Open exactly one queue slot and insert authored work from a side spur. */
export function PriorityInsertion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const insertion = input.queue.findIndex(propEq("id", input.insertBeforeId));
  const shift = ramp(frame, 64, 44, EASE.inOut);
  const incoming = ramp(frame, 120, 12, EASE.inOut);
  const spur = ramp(frame, 108, 12, EASE.inOut);
  const insertionY = 190 + 58 * insertion;
  return (
    <g>
      <g opacity={ramp(frame, 12, 26)}>
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
        <path
          d="M80 160 l-6 10 M80 160 l6 10 M80 160 V532"
          stroke={accent}
          fill="none"
        />
        {Array.from({ length: input.queue.length + 1 }, (_, index) => (
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
              color={STOCK.muted}
            />
            {input.showOriginalPositions && index < input.queue.length ? (
              <rect
                data-original-slot={index}
                x={96}
                y={186 + 58 * index}
                width={368}
                height={56}
                rx={8}
                fill="none"
                stroke={STOCK.line}
                strokeDasharray="3 6"
              />
            ) : undefined}
          </g>
        ))}
      </g>
      <g opacity={ramp(frame, 38, 26)}>
        <path
          d={`M760 300 V${insertionY + 24} H460`}
          stroke={STOCK.orange}
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
          color={STOCK.orange}
        />
      </g>
      {input.queue.map((item, index) => (
        <PriorityQueueItem
          key={item.id}
          item={item}
          x={100}
          y={190 + 58 * (index + (index >= insertion ? shift : 0))}
          accent={accent}
          opacity={ramp(frame, 12 + index * 2, 18)}
        />
      ))}
      <PriorityQueueItem
        item={input.incomingItem}
        x={mix(incoming, 580, 100)}
        y={mix(spur, 276, insertionY)}
        accent={accent}
        opacity={ramp(frame, 38, 26)}
        isIncoming
      />
    </g>
  );
}
