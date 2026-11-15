import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./ProportionalSymbolArea.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./ProportionalSymbolArea.schema";
/** Public retrieval copy excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/**
 * Explicit indexed authored prose paths. Structural keys remain literal data.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["sites", 0, "label"],
  ["sites", 1, "label"],
  ["unitLabel"],
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
      id: "motionAtlas.proportional-symbol-area.bindingExamples.0.sourceText",
      message:
        "Map values 1 and 4 at two fictional sites with 400 square pixels per unit. The second symbol has four times the area and twice the radius.",
    },
    input: {
      sites: [
        {
          id: "a",
          label: "Site A",
          x: 25,
          y: 45,
          value: 1,
        },
        {
          id: "b",
          label: "Site B",
          x: 70,
          y: 55,
          value: 4,
        },
      ],
      areaPerUnit: 400,
      unitLabel: "items",
      showRadiusComparison: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
];
