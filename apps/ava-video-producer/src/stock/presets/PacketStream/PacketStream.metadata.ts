import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./PacketStream.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const packetStreamMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const PACKET_STREAM_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["lanes", 0, "label"],
  ["lanes", 1, "label"],
  ["lanes", 2, "label"],
  ["heading"],
];
