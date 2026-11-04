import { propEq } from "@avandar/utils";
import { ramp, mix, EASE } from "../../../motion";
import type { Input } from "./SurveillanceReportingBackfill.schema";
/** Data for getRecordPlacementsFromInputAndFrame. */
type GetRecordPlacementsResult = {
  progress: number;
  x: number;
  y: number;
  key: number;
  id: string;
  label: string;
  eventBinId: string;
  firstSnapshot: 0 | 1;
};

/** Receipt tokens travel to their event bin exactly once. */
export function getRecordPlacementsFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetRecordPlacementsResult[] {
  const ordered = [...input.records].sort(
    (first, second) =>
      first.firstSnapshot - second.firstSnapshot ||
      (first.id < second.id ? -1 : first.id > second.id ? 1 : 0),
  );
  const later = ordered.filter(propEq("firstSnapshot", 1));
  return ordered.map((record) => {
    const bin = input.eventBins.findIndex(propEq("id", record.eventBinId));
    const rank = ordered
      .filter((item) => item.eventBinId === record.eventBinId)
      .findIndex(propEq("id", record.id));
    const arrival = later.findIndex(propEq("id", record.id));
    const progress =
      record.firstSnapshot === 0
        ? 1
        : ramp(frame, 36 + arrival * 2, 50, EASE.inOut);
    return {
      ...record,
      progress,
      x: mix(
        progress,
        80 + arrival * 43,
        68 + ((bin + 0.5) * 480) / input.eventBins.length,
      ),
      y: mix(progress, 265, 470 - rank * 18),
      key: input.records.findIndex(propEq("id", record.id)) + 1,
    };
  });
}
