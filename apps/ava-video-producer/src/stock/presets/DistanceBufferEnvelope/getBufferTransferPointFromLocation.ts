import { mix } from "../../../motion";
import type { Input } from "./DistanceBufferEnvelope.schema";
/**
 * Transfer corridor clears source labels before entering the inclusion rail.
 */
export function getBufferTransferPointFromLocation({
  location,
  ledgerIndex,
  progress,
}: Readonly<{
  location: Input["locations"][number];
  ledgerIndex: number;
  progress: number;
}>): { x: number; y: number } {
  const points = [
    { x: 48 + location.x * 3.6, y: 190 + location.y * 3.6 },
    { x: 424, y: 190 + location.y * 3.6 },
    { x: 424, y: 260 },
    { x: 700, y: 260 },
    { x: 700, y: 278 + ledgerIndex * 48 },
  ];
  const segment = Math.min(3, Math.floor(progress * 4)),
    segmentProgress = progress === 1 ? 1 : progress * 4 - segment;
  return {
    x: mix(segmentProgress, points[segment].x, points[segment + 1].x),
    y: mix(segmentProgress, points[segment].y, points[segment + 1].y),
  };
}
