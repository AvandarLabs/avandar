import { propEq } from "@avandar/utils";
import { mix, ramp, EASE } from "../../../motion";
import type { Input } from "./PersonLedSupportCalendar.schema";
/** Data for getCellFromCommitment. */
type GetCellFromCommitmentResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  initial: { x: number; y: number; width: number; height: number };
  agreed: { x: number; y: number; width: number; height: number };
  x: number;
  y: number;
  width: number;
  height: number;
  gripX: number;
  gripY: number;
};

/**
 * The worker proposes; the participant carries the sole support appointment.
 */
function _getAppointmentGeometryFromInput({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetAppointmentGeometryResult {
  const commitment = input.commitments.find(propEq("kind", "support"))!;
  const initial = _getCellFromCommitment({ input, commitment, agreed: false });
  const agreed = _getCellFromCommitment({ input, commitment, agreed: true });
  const proposal = ramp(frame, 12, 24, EASE.inOut);
  const carry = ramp(frame, 52, 48, EASE.inOut);
  const x =
    frame < 52
      ? mix(proposal, 790, initial.x)
      : mix(carry, initial.x, agreed.x);
  const y =
    frame < 52
      ? mix(proposal, 196, initial.y)
      : mix(carry, initial.y, agreed.y) - 22 * Math.sin(Math.PI * carry);
  const width = frame < 36 ? mix(proposal, 120, initial.width) : initial.width;
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
