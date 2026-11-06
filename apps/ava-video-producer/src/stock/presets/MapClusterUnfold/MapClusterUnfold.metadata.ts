import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./MapClusterUnfold.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./MapClusterUnfold.schema";
/** Public retrieval copy excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/**
 * Explicit indexed authored prose paths. Structural keys remain literal data.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["points", 0, "label"],
  ["points", 1, "label"],
  ["points", 2, "label"],
  ["points", 3, "label"],
  ["clusters", 0, "label"],
  ["clusters", 1, "label"],
  ["labels", "points"],
  ["labels", "clusters"],
  ["labels", "total"],
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
      id: "motionAtlas.map-cluster-unfold.bindingExamples.0.sourceText",
      message:
        "Group Point A and B in West cluster and Point C and D in East cluster. Each cluster shows 2; unfolding restores the same four point positions.",
    },
    input: {
      points: [
        {
          id: "a",
          label: "Point A",
          x: 20,
          y: 30,
          clusterId: "west",
        },
        {
          id: "b",
          label: "Point B",
          x: 28,
          y: 45,
          clusterId: "west",
        },
        {
          id: "c",
          label: "Point C",
          x: 72,
          y: 40,
          clusterId: "east",
        },
        {
          id: "d",
          label: "Point D",
          x: 80,
          y: 55,
          clusterId: "east",
        },
      ],
      clusters: [
        {
          id: "west",
          label: "West cluster",
          x: 24,
          y: 38,
        },
        {
          id: "east",
          label: "East cluster",
          x: 76,
          y: 48,
        },
      ],
      labels: {
        points: "Individual records",
        clusters: "Grouped display",
        total: "Same supplied points",
      },
      showMemberIds: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
];
