import { propEq } from "@avandar/utils";
import type { Input } from "./ClusterEpicurveLink.schema";
/** Data for getCasePositionsFromInput. */
type GetCasePositionsResult = {
  record: {
    id: string;
    label: string;
    x: number;
    y: number;
    onsetBinId: string | null;
  };
  index: number;
  binIndex: number;
  mapX: number;
  mapY: number;
  histogramX: number;
  histogramY: number;
  isInvestigated: boolean;
  isFocused: boolean;
};

/** Exact map coordinates and ordered, individually keyed histogram segments. */
export function getCasePositionsFromInput(
  input: Readonly<Input>,
): GetCasePositionsResult[] {
  return input.cases.map((record, index) => {
    const binIndex =
      record.onsetBinId === null
        ? input.timeBins.length
        : input.timeBins.findIndex(
            propEq<{ id: unknown }, "id", unknown>("id", record.onsetBinId),
          );
    const stackIndex = input.cases
      .slice(0, index)
      .filter(propEq("onsetBinId", record.onsetBinId)).length;
    return {
      record,
      index,
      binIndex,
      mapX: 60 + record.x * 2.5,
      mapY: 145 + record.y * 1.9,
      histogramX: 365 + binIndex * 38,
      histogramY: 332 - stackIndex * 17,
      // The validated investigation subset contains at most eight IDs.
      // Set construction regressed bounded frame lookups in
      // measurement.
      // react-doctor-disable-next-line js-set-map-lookups
      isInvestigated: input.investigationCaseIds.includes(record.id),
      isFocused:
        input.focusedBinId !== null && record.onsetBinId === input.focusedBinId,
    };
  });
}
