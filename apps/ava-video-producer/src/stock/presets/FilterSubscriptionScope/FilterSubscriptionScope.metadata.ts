import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./FilterSubscriptionScope.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./FilterSubscriptionScope.schema";
/** Public retrieval copy excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/**
 * Explicit indexed authored prose paths. Structural keys remain literal data.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["views", 0, "label"],
  ["views", 1, "label"],
  ["views", 2, "label"],
  ["metric", "valueLabel"],
  ["metric", "valueUnit"],
  ["metric", "countUnit"],
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
      id: "motionAtlas.filter-subscription-scope.bindingExamples.0.sourceText",
      message:
        "Select West over records West 2, East 5 and West 3. Two subscribed views show two records totaling 5; the unsubscribed reference keeps all three totaling 10.",
    },
    input: {
      records: [
        {
          id: "a",
          category: "West",
          value: 2,
        },
        {
          id: "b",
          category: "East",
          value: 5,
        },
        {
          id: "c",
          category: "West",
          value: 3,
        },
      ],
      views: [
        {
          id: "one",
          label: "Selected items",
          subscribed: true,
        },
        {
          id: "two",
          label: "Selected records",
          subscribed: true,
        },
        {
          id: "three",
          label: "All items reference",
          subscribed: false,
        },
      ],
      selectedCategory: "West",
      showExcludedRecords: true,
      copy: {
        context: "Fictional document",
        source: "Original",
        result: "Extracted result",
      },
      metric: {
        valueLabel: "Recorded items",
        valueUnit: "items",
        countUnit: "records",
      },
    },
  },
];
