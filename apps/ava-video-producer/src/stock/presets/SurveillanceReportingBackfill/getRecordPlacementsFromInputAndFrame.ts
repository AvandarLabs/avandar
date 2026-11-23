import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
type RecordPlacementsArgs = Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>;
/** Records from the earlier snapshot first, then by ID. */
function _sortRecordsBySnapshot(records: Input["records"]): Input["records"] {
  return [...records].sort((first, second) => {
    return (
      first.firstSnapshot - second.firstSnapshot ||
      (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
    );
  });
}
/** Receipt tokens travel to their event bin exactly once. */
export function getRecordPlacementsFromInputAndFrame({
  input,
  frame,
  motion,
}: RecordPlacementsArgs): GetRecordPlacementsResult[] {
  const ordered = _sortRecordsBySnapshot(input.records);
  const later = ordered.filter(propEq("firstSnapshot", 1));
  return ordered.map((record) => {
    const bin = input.eventBins.findIndex(propEq("id", record.eventBinId));
    const rank = ordered
      .filter(propEq("eventBinId", record.eventBinId))
      .findIndex(propEq("id", record.id));
    const arrival = later.findIndex(propEq("id", record.id));
    const progress =
      record.firstSnapshot === 0
        ? 1
        : motion.ramp(
            frame,
            36 + arrival * motion.scaleStagger(2),
            motion.scale(50),
            motion.travel.easing,
          );
    return {
      ...record,
      progress,
      x: Motion.mix({
        t: progress,
        from: 80 + arrival * 43,
        to: 68 + ((bin + 0.5) * 480) / input.eventBins.length,
      }),
      y: Motion.mix({
        t: progress,
        from: 265,
        to: 470 - rank * 18,
      }),
      key: input.records.findIndex(propEq("id", record.id)) + 1,
    };
  });
}
