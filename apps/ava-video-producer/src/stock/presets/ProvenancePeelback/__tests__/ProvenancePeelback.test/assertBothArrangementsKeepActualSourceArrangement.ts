import { fixtures } from "../../ProvenancePeelback.fixtures";
import { type Input } from "../../ProvenancePeelback.schema";
import { assertBothArrangementsKeepActualFrame as _assertBothArrangementsKeepActualFrame } from "./assertBothArrangementsKeepActualFrame";

/**
 * Asserts both arrangements keep actual paragraph baselines within their
 * upright source sheets.
 */
export function assertBothArrangementsKeepActualSourceArrangement(
  sourceArrangement: string,
): void {
  const input = {
    ...fixtures[2].input,
    sourceArrangement: sourceArrangement as Input["sourceArrangement"],
    summary: {
      label: "界".repeat(32),
      text: Array(7).fill("界".repeat(11)).join(" ").slice(0, 82),
    },
    sources: fixtures[2].input.sources.map((source) => {
      return {
        ...source,
        excerpt: Array(7).fill("界".repeat(11)).join(" ").slice(0, 78),
      };
    }),
  };
  [18, 72, 104, 150].forEach((frame) => {
    return _assertBothArrangementsKeepActualFrame({ frame, input });
  });
}
