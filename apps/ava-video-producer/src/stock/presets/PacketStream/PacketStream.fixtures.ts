import { STOCK } from "../../stockPalette";
import type { StockContract } from "../../contracts/StockContract.types";
import type { PacketStreamInput } from "./PacketStream.schema";

/** Complete fictional example used only when input is omitted. */
export const packetStreamDefaultInput: PacketStreamInput = {
  lanes: [
    { label: "STREAM A", color: STOCK.cyan, offset: 0 },
    { label: "STREAM B", color: STOCK.mint, offset: 28 },
    { label: "STREAM C", color: STOCK.orange, offset: 59 },
  ],
  packetsPerLane: 4,
  heading: "Signals in motion",
  showReceipts: true,
};

/** The maximum supported collection density in the authored layout. */
export const packetStreamDenseInput: PacketStreamInput = {
  ...packetStreamDefaultInput,
  packetsPerLane: 6,
};

/** A complete smaller or differently selected authored example. */
export const packetStreamChangedInput: PacketStreamInput = {
  ...packetStreamDefaultInput,
  lanes: [{ label: "AUTHORED", color: STOCK.cyan, offset: 10 }],
  packetsPerLane: 2,
  heading: "One authored lane",
  showReceipts: false,
};

/** Named examples available to editors and semantic regression checks. */
export const packetStreamFixtures: StockContract<
  typeof packetStreamDefaultInput
>["fixtures"] = [
  { id: "default", input: packetStreamDefaultInput },
  { id: "dense", input: packetStreamDenseInput },
  { id: "changed", input: packetStreamChangedInput },
];
