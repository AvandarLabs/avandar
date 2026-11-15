import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable copy editor. */
export const COPY_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.copy.help",
    message:
      "Set the acknowledgement and closing context. Each string <= 38 characters.",
  },
  path: "copy",
  kind: "object",
  controls: [
    {
      path: "acknowledgement",
      kind: "text",
      minLength: 0,
      maxLength: 38,
      label: {
        id: "motionAtlas.private-case-conversation.controls.copy.acknowledgement",
        message: "acknowledgement",
      },
    },
    {
      path: "hold",
      kind: "text",
      minLength: 0,
      maxLength: 38,
      label: {
        id: "motionAtlas.private-case-conversation.controls.copy.hold",
        message: "hold",
      },
    },
    {
      path: "example",
      kind: "text",
      minLength: 0,
      maxLength: 38,
      label: {
        id: "motionAtlas.private-case-conversation.controls.copy.example",
        message: "example",
      },
    },
  ],
  label: {
    id: "motionAtlas.private-case-conversation.controls.copy",
    message: "copy",
  },
};
