import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./CoordinateQualityTriage.schema";

type Reason = "plotted" | "missing" | "nonNumeric" | "range";

const TRIAGE_AT = 51;
const TRIAGE_STEP = 3;
const TRIAGE_FRAMES = 39;
/** Data for TriagedRow. */
type TriagedRowResult = {
  index: number;
  reason: Reason;
  representativeIndex: number;
  /** The frame the row's token reaches its target. */
  arrivedAt: number;
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
    ? input.rows.findIndex((candidate) => {
        return (
          candidate.latitude === row.latitude &&
          candidate.longitude === row.longitude
        );
      })
    : index;
}
/**
 * Classify literal pairs without coercion and preserve every source identity.
 */
export function makeCoordinateTriageFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel">;
}>): {
  rows: TriagedRow[];
  counts: Array<{ reason: Reason; count: number }>;
} {
  const reasons = input.rows.map(_getReason);
  const rows = input.rows.map((row, index) => {
    const reason = reasons[index];
    const rank = reasons.slice(0, index).filter((item) => {
      return item === reason;
    }).length;
    const tray = ["missing", "nonNumeric", "range"].indexOf(reason);
    const targetX =
      reason === "plotted" && typeof row.longitude === "number"
        ? 50 + ((row.longitude + 180) / 360) * 340
        : 55 + tray * 135 + (rank % 4) * 26;
    const targetY =
      reason === "plotted" && typeof row.latitude === "number"
        ? 180 + ((90 - row.latitude) / 180) * 210
        : 440 + Math.floor(rank / 4) * 22;
    const departedAt = TRIAGE_AT + index * TRIAGE_STEP;
    const progress = motion.ramp(
      frame,
      departedAt,
      motion.scale(TRIAGE_FRAMES),
      motion.travel.easing,
    );
    return {
      ...row,
      index,
      reason,
      representativeIndex: _getRepresentativeIndex({ input, row, index }),
      arrivedAt: departedAt + motion.scale(TRIAGE_FRAMES),
      targetX,
      targetY,
      x: mix(progress, 450, targetX),
      y: mix(progress, 132 + index * 69, targetY),
    };
  });
  const counts = (["plotted", "missing", "nonNumeric", "range"] as const).map(
    (reason) => {
      return {
        reason,
        count: rows.filter((row) => {
          return row.reason === reason && frame >= row.arrivedAt;
        }).length,
      };
    },
  );
  return { rows, counts };
}
