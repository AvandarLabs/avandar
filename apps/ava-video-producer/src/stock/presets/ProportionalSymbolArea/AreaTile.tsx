import { mix } from "../../../motion";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";
type Props = {
  site: Input["sites"][number];
  unitIndex: number;
  progress: number;
  radius: number;
  accent: string;
  areaPerUnit: number;
};
function _getBoundaryPoint(step: number) {
  const distance = step * 4,
    side = Math.floor(distance),
    offset = distance - side;
  return side === 0
    ? [offset - 0.5, -0.5]
    : side === 1
      ? [0.5, offset - 0.5]
      : side === 2
        ? [0.5 - offset, 0.5]
        : [-0.5, 0.5 - offset];
}
/** Each complete source tile morphs into its own sector of the same symbol. */
export function AreaTile({
  site,
  unitIndex,
  progress,
  radius,
  accent,
  areaPerUnit,
}: Readonly<Props>): ReactNode {
  const side = Math.sqrt(areaPerUnit),
    columns = Math.ceil(Math.sqrt(site.value)),
    rows = Math.ceil(site.value / columns);
  const originX = 48 + site.x * 4,
    originY = 148 + site.y * 4;
  const points = Array.from({ length: 32 }, (_, vertex) => {
    const step = vertex / 32,
      [squareX, squareY] = _getBoundaryPoint(step);
    const angle =
      (2 * Math.PI * (unitIndex + Math.max(0, (step - 0.1) / 0.8))) /
        site.value -
      Math.PI / 2;
    const onArc = step >= 0.1 && step <= 0.9,
      sectorX = onArc ? Math.cos(angle) * radius : 0,
      sectorY = onArc ? Math.sin(angle) * radius : 0;
    const sourceX =
        ((unitIndex % columns) - (columns - 1) / 2 + squareX) * side,
      sourceY =
        (Math.floor(unitIndex / columns) - (rows - 1) / 2 + squareY) * side;
    return `${originX + mix(progress, sourceX, sectorX)} ${originY + mix(progress, sourceY, sectorY)}`;
  });
  return (
    <path
      data-unit-tile={`${site.id}:${unitIndex}`}
      d={`M${points.join(" L")} Z`}
      fill={accent}
      fillOpacity={progress === 1 ? 0 : 0.4}
      stroke={accent}
      strokeOpacity={progress === 1 ? 0 : 0.7}
    />
  );
}
