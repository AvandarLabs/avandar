import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable partition editor. */
export const PARTITION_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.partition.help",
    message:
      "Choose the physical separator that closes after the supporter leaves. One of door or screen; both preserve distinct meeting and waiting spaces.",
  },
  path: "partition",
  kind: "select",
  options: [
    {
      value: "door",
      label: {
        id: "motionAtlas.private-case-conversation.controls.partition.0",
        message: "door",
      },
    },
    {
      value: "screen",
      label: {
        id: "motionAtlas.private-case-conversation.controls.partition.1",
        message: "screen",
      },
    },
  ],
  label: {
    id: "motionAtlas.private-case-conversation.controls.partition",
    message: "partition",
  },
};
