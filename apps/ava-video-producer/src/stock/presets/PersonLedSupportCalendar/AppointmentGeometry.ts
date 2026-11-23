import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PersonLedSupportCalendar.schema";

/** Data for getCellFromCommitment. */
type GetCellFromCommitmentResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AppointmentPositionOptions = {
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
  initial: GetCellFromCommitmentResult;
  agreed: GetCellFromCommitmentResult;
  proposal: number;
};

type AppointmentPositionResult = { x: number; y: number };

/** Data for getAppointmentGeometry. */
type GetAppointmentGeometryResult = {
  commitment: {
    id: string;
    label: string;
    kind: "existing" | "support";
    initialDayId: string;
    initialBandId: string;
    agreedDayId: string;
    agreedBandId: string;
  };
  initial: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  agreed: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  gripX: number;
  gripY: number;
};

/** Related appointment geometry operations. */
export const AppointmentGeometry = {
  /**
   * Authored planner cell geometry with space for complete fixed-size labels.
   */
  getCellFromCommitment: _getCellFromCommitment,
  /**
   * The worker proposes; the participant carries the sole support appointment.
   */
  fromInput: _getAppointmentGeometryFromInput,
} satisfies {
  getCellFromCommitment: typeof _getCellFromCommitment;
  fromInput: typeof _getAppointmentGeometryFromInput;
};

/** Samples the appointment geometry xand y for the current authored frame. */
function _getAppointmentGeometryXAndY({
  frame,
  motion,
  initial,
  agreed,
  proposal,
}: Readonly<AppointmentPositionOptions>): AppointmentPositionResult {
  const carry = motion.ramp(frame, 52, motion.scale(48), motion.travel.easing);
  const x =
    frame < 52
      ? Motion.mix({
          t: proposal,
          from: 790,
          to: initial.x,
        })
      : Motion.mix({
          t: carry,
          from: initial.x,
          to: agreed.x,
        });
  const y =
    frame < 52
      ? Motion.mix({
          t: proposal,
          from: 196,
          to: initial.y,
        })
      : Motion.mix({
          t: carry,
          from: initial.y,
          to: agreed.y,
        }) -
        22 * Math.sin(Math.PI * carry);
  return { x, y };
}

/** Authored planner cell geometry with space for complete fixed-size labels. */
function _getCellFromCommitment({
  input,
  commitment,
  agreed,
}: Readonly<{
  input: Input;
  commitment: Input["commitments"][number];
  agreed: boolean;
}>): GetCellFromCommitmentResult {
  const column = input.days.findIndex(
    propEq("id", agreed ? commitment.agreedDayId : commitment.initialDayId),
  );
  const row = input.timeBands.findIndex(
    propEq("id", agreed ? commitment.agreedBandId : commitment.initialBandId),
  );
  return {
    x: 240 + (column * 540) / input.days.length + 4,
    y: 214 + (row * 228) / input.timeBands.length + 4,
    width: 540 / input.days.length - 8,
    height: 228 / input.timeBands.length - 4,
  };
}

/**
 * The worker proposes; the participant carries the sole support appointment.
 */
function _getAppointmentGeometryFromInput({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): GetAppointmentGeometryResult {
  const commitment = input.commitments.find(propEq("kind", "support"))!;
  const initial = _getCellFromCommitment({ input, commitment, agreed: false });
  const agreed = _getCellFromCommitment({ input, commitment, agreed: true });
  const proposal = motion.ramp(
    frame,
    12,
    motion.scale(24),
    motion.travel.easing,
  );
  const { x, y } = _getAppointmentGeometryXAndY({
    frame,
    motion,
    initial,
    agreed,
    proposal,
  });
  const width =
    frame < 36
      ? Motion.mix({
          t: proposal,
          from: 120,
          to: initial.width,
        })
      : initial.width;
  return {
    commitment,
    initial,
    agreed,
    x,
    y,
    width,
    height: initial.height,
    gripX: x + width / 2,
    gripY: y,
  };
}
