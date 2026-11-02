import type { StockContract } from "../../contracts/StockContract.types";
import type { NodeTraversalInput } from "./NodeTraversal.schema";

/** Complete fictional example used only when input is omitted. */
export const NODE_TRAVERSAL_DEFAULT_INPUT: NodeTraversalInput = {
  nodes: [
    { x: 136, y: 302, label: "A", detail: "START" },
    { x: 310, y: 170, label: "B" },
    { x: 310, y: 424, label: "C" },
    { x: 502, y: 302, label: "D" },
    { x: 680, y: 170, label: "E" },
    { x: 680, y: 424, label: "F" },
    { x: 842, y: 302, label: "G", detail: "FINISH" },
  ],
  edges: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [3, 4],
    [3, 5],
    [4, 6],
    [5, 6],
  ],
  route: [0, 2, 3, 4, 6],
  showRouteLabel: true,
};

/** The maximum supported collection density in the authored layout. */
export const nodeTraversalDenseInput: NodeTraversalInput = {
  ...NODE_TRAVERSAL_DEFAULT_INPUT,
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [0, 2],
    [4, 6],
  ],
  route: [0, 1, 2, 3, 4, 5, 6],
};

/** A complete smaller or differently selected authored example. */
export const nodeTraversalChangedInput: NodeTraversalInput = {
  ...NODE_TRAVERSAL_DEFAULT_INPUT,
  route: [0, 1, 3, 5, 6],
  showRouteLabel: false,
};

/** Named examples available to editors and semantic regression checks. */
export const nodeTraversalFixtures: StockContract<
  typeof NODE_TRAVERSAL_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: NODE_TRAVERSAL_DEFAULT_INPUT },
  { id: "dense", input: nodeTraversalDenseInput },
  { id: "changed", input: nodeTraversalChangedInput },
];
