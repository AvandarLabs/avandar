import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SealedHandoff.fixtures";
import authoredMetadata from "./SealedHandoff.metadata.yaml";
import type {
  StockContract,
  StockControl,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.sealed-handoff.${key}`, message };
}
/**
 * Public retrieval copy preserves accepted intent without private provenance.
 */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);
/** Serializable controls preserve nested fields and collection bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "brief",
    label: {
      id: "motionAtlas.sealed-handoff.controls.brief",
      message: "brief",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.brief.help",
      message:
        "The literal brief lines visible before closure and after any permitted recipient reveal.",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        line: {
          type: "string",
          minLength: 1,
          maxLength: 36,
        },
      },
      required: ["id", "line"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.sealed-handoff.controls.brief.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "line",
        label: {
          id: "motionAtlas.sealed-handoff.controls.brief.line",
          message: "line",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
  },
  {
    path: "address",
    label: {
      id: "motionAtlas.sealed-handoff.controls.address",
      message: "address",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.address.help",
      message:
        "Routing information intentionally visible on the exterior of the sealed envelope.",
    },
    kind: "object",
    controls: [
      {
        path: "sender",
        label: {
          id: "motionAtlas.sealed-handoff.controls.address.sender",
          message: "sender",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "recipient",
        label: {
          id: "motionAtlas.sealed-handoff.controls.address.recipient",
          message: "recipient",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "reference",
        label: {
          id: "motionAtlas.sealed-handoff.controls.address.reference",
          message: "reference",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.sealed-handoff.controls.copy",
      message: "copy",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.copy.help",
      message: "All state and example captions.",
    },
    kind: "object",
    controls: [
      {
        path: "contents",
        label: {
          id: "motionAtlas.sealed-handoff.controls.copy.contents",
          message: "contents",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "covered",
        label: {
          id: "motionAtlas.sealed-handoff.controls.copy.covered",
          message: "covered",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "received",
        label: {
          id: "motionAtlas.sealed-handoff.controls.copy.received",
          message: "received",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "opened",
        label: {
          id: "motionAtlas.sealed-handoff.controls.copy.opened",
          message: "opened",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.sealed-handoff.controls.copy.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
  },
  {
    path: "revealRule",
    label: {
      id: "motionAtlas.sealed-handoff.controls.revealRule",
      message: "revealRule",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.revealRule.help",
      message:
        "Author whether the recipient opens the envelope or whether the loop ends with it sealed.",
    },
    kind: "select",
    options: [
      {
        value: "recipient",
        label: {
          id: "motionAtlas.sealed-handoff.options.revealRule.recipient",
          message: "recipient",
        },
      },
      {
        value: "remain-sealed",
        label: {
          id: "motionAtlas.sealed-handoff.options.revealRule.remain-sealed",
          message: "remain-sealed",
        },
      },
    ],
  },
  {
    path: "showExteriorReference",
    label: {
      id: "motionAtlas.sealed-handoff.controls.showExteriorReference",
      message: "showExteriorReference",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.showExteriorReference.help",
      message:
        "Show the supplied reference on the exterior while sender and recipient remain available.",
    },
    kind: "boolean",
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.sealed-handoff.controls.showLabels",
      message: "showLabels",
    },
    help: {
      id: "motionAtlas.sealed-handoff.controls.showLabels.help",
      message: "Show the supplied address, brief text, and captions.",
    },
    kind: "boolean",
  },
];
/**
 * Explicit numeric paths cover all visible default copy across the timeline.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["brief", 0, "line"],
  ["brief", 1, "line"],
  ["address", "sender"],
  ["address", "recipient"],
  ["address", "reference"],
  ["copy", "contents"],
  ["copy", "covered"],
  ["copy", "received"],
  ["copy", "opened"],
  ["copy", "example"],
];
/** Complete fictional binding, validated without inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "The fictional coordinator receives an addressed brief whose contents stay covered throughout the handoff and become visible only when the coordinator opens it.",
    }),
    input: DEFAULT_INPUT,
  },
];
