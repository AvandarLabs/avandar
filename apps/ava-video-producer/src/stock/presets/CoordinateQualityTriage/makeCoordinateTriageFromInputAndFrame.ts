import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./CoordinateQualityTriage.schema";
/** Inputs for getReason. */
type GetReasonArguments = Input["rows"][number];

/** Inputs for getRepresentativeIndex. */
type GetRepresentativeIndexArguments = {
  input: Input;
  row: Input["rows"][number];
  index: number;
};

/** Inputs for makeCoordinateTriageFromInputAndFrame. */
type MakeCoordinateTriageFromInputAndFrameArguments = {
  input: Input;
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel">;
};

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
function _getReason(row: Readonly<GetReasonArguments>): Reason {
  if (row.latitude === null || row.longitude === null) {
    return "missing";
  }
  return typeof row.latitude !== "number" || typeof row.longitude !== "number"
    ? "nonNumeric"
    : row.latitude < -90 ||
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
}: Readonly<GetRepresentativeIndexArguments>): number {
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
 * Keeps each literal coordinate pair and its deterministic tray or map pose.
 */
function _createTriagedRowFromFrame({
  input,
  row,
  index,
  reasons,
  frame,
  motion,
}: Readonly<CreateTriagedRowFromFrameOptions>): TriagedRow {
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
    x: Motion.mix({ t: progress, from: 450, to: targetX }),
    y: Motion.mix({ t: progress, from: 132 + index * 69, to: targetY }),
  };
}

/**
 * Classify literal pairs without coercion and preserve every source identity.
 */
export function makeCoordinateTriageFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<MakeCoordinateTriageFromInputAndFrameArguments>): {
  rows: TriagedRow[];
  counts: Array<{
    reason: Reason;
    count: number;
  }>;
} {
  const reasons = input.rows.map(_getReason);
  const rows = input.rows.map((row, index) => {
    return _createTriagedRowFromFrame({
      input,
      row,
      index,
      reasons,
      frame,
      motion,
    });
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

type CreateTriagedRowFromFrameOptions = {
  input: Input;
  row: Input["rows"][number];
  index: number;
  reasons: readonly Reason[];
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel">;
};
