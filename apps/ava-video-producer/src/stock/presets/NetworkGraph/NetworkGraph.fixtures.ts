import type { StockContract } from "../../contracts/StockContract.types";
import type { NetworkGraphInput } from "./NetworkGraph.schema";

/** Complete fictional example used only when input is omitted. */
export const NETWORK_GRAPH_DEFAULT_INPUT: NetworkGraphInput = {
  nodes: [
    { x: 480, y: 288, label: "Nexus", detail: "CENTRAL NODE" },
    { x: 235, y: 190, label: "Alpha" },
    { x: 250, y: 410, label: "Beta" },
    { x: 480, y: 118, label: "Gamma" },
    { x: 730, y: 190, label: "Delta" },
    { x: 715, y: 410, label: "Epsilon" },
    { x: 480, y: 464, label: "Zeta" },
  ],
  edges: [
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 3],
    [3, 4],
    [2, 6],
    [6, 5],
  ],
  showPackets: true,
};

/** The maximum supported collection density in the authored layout. */
export const networkGraphDenseInput: NetworkGraphInput = {
  ...NETWORK_GRAPH_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const networkGraphChangedInput: NetworkGraphInput = {
  ...NETWORK_GRAPH_DEFAULT_INPUT,
  nodes: NETWORK_GRAPH_DEFAULT_INPUT.nodes
    .slice(0, 2)
    .map((node, index) => ({ ...node, label: index ? "East" : "West" })),
  edges: [[0, 1]],
  showPackets: false,
};

/** Named examples available to editors and semantic regression checks. */
export const networkGraphFixtures: StockContract<
  typeof NETWORK_GRAPH_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: NETWORK_GRAPH_DEFAULT_INPUT },
  { id: "dense", input: networkGraphDenseInput },
  { id: "changed", input: networkGraphChangedInput },
];
