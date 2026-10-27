import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  packetStreamDefaultInput,
  packetStreamFixtures,
} from "./PacketStream.fixtures";
import {
  packetStreamMetadata,
  PACKET_STREAM_DEFAULT_TEXT_PATHS,
} from "./PacketStream.metadata";
import { packetStreamInputSchema } from "./PacketStream.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const packetStreamContract: StockContract<
  typeof packetStreamDefaultInput
> = makeLegacyContractFromDefinition({
  id: "packet-stream",
  inputSchema: packetStreamInputSchema,
  defaultInput: packetStreamDefaultInput,
  fixtures: packetStreamFixtures,
  metadata: packetStreamMetadata,
  defaultTextPaths: PACKET_STREAM_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});
