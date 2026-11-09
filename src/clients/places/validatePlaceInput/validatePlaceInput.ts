import type { PlaceInput } from "@/clients/places/places.types";

const MAX_NAME_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** The place form's raw field values, every text field as typed. */
export type PlaceInputDraft = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  notes: string;
};

/** Why a draft cannot be saved. The form translates each into a message. */
export type PlaceInputInvalidReason =
  | "nameRequired"
  | "nameTooLong"
  | "addressTooLong"
  | "notesTooLong"
  | "latitudeOutOfRange"
  | "longitudeOutOfRange"
  | "invalidDateTime"
  | "endsBeforeStarts";

/** A saveable `PlaceInput`, or the first reason the draft is not one. */
export type PlaceInputValidation =
  | { type: "valid"; input: PlaceInput }
  | { type: "invalid"; reason: PlaceInputInvalidReason };

function _cleanText(value: string): string | undefined {
  const cleaned = value.replaceAll("\u0000", "").trim();
  return cleaned === "" ? undefined : cleaned;
}

function _isRealDateTime(value: string): boolean {
  const [year, month, day, hour, minute, second] = value
    .split(/[-T:]/)
    .map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    (second ?? 0) <= 59
  );
}

function _cleanDateTime(value: string): string | undefined | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const isValid = DATE_TIME_PATTERN.test(trimmed) && _isRealDateTime(trimmed);
  return isValid ? trimmed.slice(0, 16) : "invalid";
}

function _isInRange(value: number, limit: number): boolean {
  return Number.isFinite(value) && value >= -limit && value <= limit;
}

function _getLengthReason(
  options: Readonly<{ name: string; address?: string; notes?: string }>,
): PlaceInputInvalidReason | undefined {
  if (options.name.length > MAX_NAME_LENGTH) {
    return "nameTooLong";
  }
  if ((options.address?.length ?? 0) > MAX_ADDRESS_LENGTH) {
    return "addressTooLong";
  }
  return (options.notes?.length ?? 0) > MAX_NOTES_LENGTH
    ? "notesTooLong"
    : undefined;
}

/**
 * Turns the place form's fields into a `PlaceInput` that is safe to write
 * into a places dataset, or says why it is not. Use it before any place is
 * added or replaced, for example from the place form's submit handler.
 */
export function validatePlaceInput(
  draft: Readonly<PlaceInputDraft>,
): PlaceInputValidation {
  const name = _cleanText(draft.name);
  const address = _cleanText(draft.address);
  const notes = _cleanText(draft.notes);
  const startsAt = _cleanDateTime(draft.startsAt);
  const endsAt = _cleanDateTime(draft.endsAt);
  if (name === undefined) {
    return { type: "invalid", reason: "nameRequired" };
  }
  const lengthReason = _getLengthReason({ name, address, notes });
  if (lengthReason) {
    return { type: "invalid", reason: lengthReason };
  }
  if (!_isInRange(draft.latitude, 90)) {
    return { type: "invalid", reason: "latitudeOutOfRange" };
  }
  if (!_isInRange(draft.longitude, 180)) {
    return { type: "invalid", reason: "longitudeOutOfRange" };
  }
  if (startsAt === "invalid" || endsAt === "invalid") {
    return { type: "invalid", reason: "invalidDateTime" };
  }
  if (startsAt !== undefined && endsAt !== undefined && endsAt < startsAt) {
    return { type: "invalid", reason: "endsBeforeStarts" };
  }
  return {
    type: "valid",
    input: {
      name,
      address,
      latitude: draft.latitude,
      longitude: draft.longitude,
      startsAt,
      endsAt,
      notes,
    },
  };
}
