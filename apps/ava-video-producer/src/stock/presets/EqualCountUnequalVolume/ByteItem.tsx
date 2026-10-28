import { ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ByteItemLabels } from "./ByteItemLabels";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["groups"][number]["items"][number];
  input: Input;
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** Zero-byte items retain their identity tab and count despite zero width. */
export function ByteItem({
  item,
  input,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const unfolding = ramp(frame, 49, 61, EASE.inOut);
  return (
    <g data-item-id={item.id} data-item-bytes={item.bytes}>
      <rect
        data-count-tab={item.id}
        x={x}
        y={y - 15}
        width={365}
        height={34}
        rx={5}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <ByteItemLabels {...{ input, item, x, y }} />
      <rect
        data-byte-strip={item.id}
        x={440}
        y={y - 10}
        height={18}
        width={
          ((460 * item.bytes) / input.measure.scaleMaximumBytes) * unfolding
        }
        fill={accent}
      />
      <path
        d={`M${x + 365} ${y} H440`}
        stroke={accent}
        strokeOpacity={unfolding}
      />
    </g>
  );
}
