import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./ChoroplethClassBreaks.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./ChoroplethClassBreaks.schema";
/** Public retrieval copy excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/**
 * Explicit indexed authored prose paths. Structural keys remain literal data.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["zones", 0, "label"],
  ["zones", 1, "label"],
  ["zones", 2, "label"],
  ["zones", 3, "label"],
  ["schemes", 0, "label"],
  ["schemes", 1, "label"],
  ["unitLabel"],
  ["noDataLabel"],
  ["copy", "context"],
  ["copy", "before"],
  ["copy", "after"],
];
/** Complete supplied fictional binding example. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.choropleth-class-breaks.bindingExamples.0.sourceText",
      message:
        "Zones hold values 2, 4, 9 and no data. Change the internal class break from 5 to 3 within the same 0-10 domain; only the zone with 4 changes class.",
    },
    input: {
      zones: [
        {
          id: "a",
          label: "Zone A",
          value: 2,
        },
        {
          id: "b",
          label: "Zone B",
          value: 4,
        },
        {
          id: "c",
          label: "Zone C",
          value: 9,
        },
        {
          id: "d",
          label: "Zone D",
          value: null,
        },
      ],
      schemes: [
        {
          label: "Equal-width example",
          breaks: [0, 5, 10],
        },
        {
          label: "Alternative breaks",
          breaks: [0, 3, 10],
        },
      ],
      unitLabel: "recorded items",
      noDataLabel: "No data reported",
      showValueRuler: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
];
