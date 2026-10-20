import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** Inclusive latitude and longitude ruler extents remain schematic. */
export function CoordinateGraticule(): ReactNode {
  return (
    <g>
      <rect
        x={50}
        y={180}
        width={340}
        height={210}
        fill="none"
        stroke={STOCK.line}
      />
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          d={`M${50 + index * 85} 180 V390 M50 ${180 + index * 52.5} H390`}
          stroke={STOCK.line}
          strokeOpacity={0.5}
        />
      ))}
      <Text x={50} y={410} size={12}>
        −180
      </Text>
      <Text x={390} y={410} size={12} anchor="end">
        180
      </Text>
      <Text x={30} y={184} size={12}>
        90
      </Text>
      <Text x={22} y={390} size={12}>
        −90
      </Text>
    </g>
  );
}
