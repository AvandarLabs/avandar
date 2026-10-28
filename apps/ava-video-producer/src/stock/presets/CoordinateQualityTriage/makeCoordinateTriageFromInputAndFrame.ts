import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./CoordinateQualityTriage.schema";
type Reason = "plotted" | "missing" | "nonNumeric" | "range";
/** Data for TriagedRow. */
type TriagedRowResult = {
  index: number;
  reason: Reason;
  representativeIndex: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

type TriagedRow = Input["rows"][number] & TriagedRowResult;
function _getReason(row: Readonly<Input["rows"][number]>): Reason {
  if (row.latitude === null || row.longitude === null) {
    return "missing";
  }
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number") {
    return "nonNumeric";
  }
  return row.latitude < -90 ||
    row.latitude > 90 ||
    row.longitude < -180 ||
    row.longitude > 180
    ? "range"
    : "plotted";
}
function _getRepresentativeIndex({
  input,
  row,
  index,
}: Readonly<{
  input: Input;
  row: Input["rows"][number];
  index: number;
}>): number {
  return _getReason(row) === "plotted"
    ? input.rows.findIndex(
        (candidate) =>
          candidate.latitude === row.latitude &&
          candidate.longitude === row.longitude,
      )
    : index;
}
/**
 * Classify literal pairs without coercion and preserve every source identity.
 */
export function makeCoordinateTriageFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  rows: TriagedRow[];
  counts: Array<{ reason: Reason; count: number }>;
} {
  const reasons = input.rows.map(_getReason);
  const rows = input.rows.map((row, index) => {
    const reason = reasons[index];
    const rank = reasons
      .slice(0, index)
      .filter((item) => item === reason).length;
    const tray = ["missing", "nonNumeric", "range"].indexOf(reason);
    const targetX =
      reason === "plotted" && typeof row.longitude === "number"
        ? 50 + ((row.longitude + 180) / 360) * 340
        : 55 + tray * 135 + (rank % 4) * 26;
    const targetY =
      reason === "plotted" && typeof row.latitude === "number"
        ? 180 + ((90 - row.latitude) / 180) * 210
        : 440 + Math.floor(rank / 4) * 22;
    const progress = ramp(frame, 51 + index * 3, 39, EASE.inOut);
    return {
      ...row,
      index,
      reason,
      representativeIndex: _getRepresentativeIndex({ input, row, index }),
      targetX,
      targetY,
      x: mix(progress, 450, targetX),
      y: mix(progress, 132 + index * 69, targetY),
    };
  });
  const counts = (["plotted", "missing", "nonNumeric", "range"] as const).map(
    (reason) => ({
      reason,
      count: reasons.filter(
        (item, index) => item === reason && frame >= 90 + index * 3,
      ).length,
    }),
  );
  return { rows, counts };
}
