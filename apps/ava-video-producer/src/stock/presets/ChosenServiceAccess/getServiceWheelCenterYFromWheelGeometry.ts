import { getServiceFloorYFromX } from "./getServiceFloorYFromX";
import type { Input } from "./ChosenServiceAccess.schema";
/** Inputs for getServiceWheelCenterYFromWheelGeometry. */
type GetServiceWheelCenterYOptions = {
  x: number;
  radius: number;
  doorX: number;
  accessChange: Input["accessChange"];
};

/** A wheel clears the complete piecewise floor, including both ramp corners. */
export function getServiceWheelCenterYFromWheelGeometry({
  x,
  radius,
  doorX,
  accessChange,
}: Readonly<GetServiceWheelCenterYOptions>): number {
  const boundaries = [
    [-Infinity, doorX - 170, 0],
    [doorX - 170, doorX - 100, -84 / 70],
    [doorX - 100, doorX - 42, accessChange === "unfold-ramp" ? -30 / 58 : 0],
    [doorX - 42, Infinity, 0],
  ];
  return Math.min(
    ...boundaries.map(([left, right, slope]) => {
      const minimumX = Math.max(x - radius, left),
        maximumX = Math.min(x + radius, right);
      if (minimumX > maximumX) {
        return Infinity;
      }
      const tangentX = Math.max(
        minimumX,
        Math.min(maximumX, x - (slope * radius) / Math.sqrt(1 + slope * slope)),
      );
      return (
        getServiceFloorYFromX({ x: tangentX, doorX, accessChange }) -
        Math.sqrt(Math.max(0, radius * radius - (tangentX - x) ** 2))
      );
    }),
  );
}
