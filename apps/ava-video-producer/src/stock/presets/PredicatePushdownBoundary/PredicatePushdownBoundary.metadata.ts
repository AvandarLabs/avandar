import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./PredicatePushdownBoundary.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./PredicatePushdownBoundary.schema";
/** Public retrieval copy excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/**
 * Explicit indexed authored prose paths. Structural keys remain literal data.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["metric", "label"],
  ["metric", "unit"],
  ["metric", "rowUnit"],
  ["labels", "source"],
  ["labels", "destination"],
  ["labels", "condition"],
  ["labels", "retained"],
  ["labels", "transferred"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete supplied fictional binding example. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.predicate-pushdown-boundary.bindingExamples.0.sourceText",
      message:
        "At the source apply value >= 5 to records 2, 7, 4 and 9. Transfer only the records with 7 and 9, keeping all originals at the source.",
    },
    input: {
      rows: [
        {
          id: "a",
          value: 2,
        },
        {
          id: "b",
          value: 7,
        },
        {
          id: "c",
          value: 4,
        },
        {
          id: "d",
          value: 9,
        },
      ],
      predicate: {
        operator: ">=",
        threshold: 5,
      },
      labels: {
        source: "Source system",
        destination: "Local query",
        condition: "Apply at source",
        retained: "Remain at source",
        transferred: "Transferred rows",
      },
      showTotals: true,
      copy: {
        context: "Fictional document",
        source: "Original",
        result: "Extracted result",
      },
      metric: {
        label: "Recorded items",
        unit: "items",
        rowUnit: "records",
      },
    },
  },
];
