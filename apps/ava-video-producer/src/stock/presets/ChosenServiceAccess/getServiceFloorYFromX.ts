import type { Input } from "./ChosenServiceAccess.schema";
/** The foreground corridor joins only the chosen ramp or level entrance. */
export function getServiceFloorYFromX({
  x,
  doorX,
  accessChange,
}: Readonly<{
  x: number;
  doorX: number;
  accessChange: Input["accessChange"];
}>): number {
  const connection = Math.max(0, Math.min(1, (x - (doorX - 170)) / 70));
  const ramp = Math.max(0, Math.min(1, (x - (doorX - 100)) / 58));
  return (
    440 - 84 * connection - (accessChange === "unfold-ramp" ? 30 * ramp : 0)
  );
}
