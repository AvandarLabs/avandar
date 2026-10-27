import { z } from "zod";
import { inputSchema } from "./SpecimenAliquotBalance.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors preserve references and explicit nullable bookings. */
export const controls: StockControl[] = [
  {
    path: "parent",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.parent",
      message: "parent",
    },
    kind: "object",
    controls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.parent.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.parent.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "volume",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.parent.volume",
          message: "volume",
        },
        kind: "number",
        min: 1,
        max: 12,
        step: 1,
      },
    ],
  },
  {
    path: "aliquots",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.aliquots",
      message: "aliquots",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.aliquots.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.aliquots.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.aliquots.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "volume",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.aliquots.volume",
          message: "volume",
        },
        kind: "number",
        min: 1,
        max: 12,
        step: 1,
      },
    ],
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 20,
  },
  {
    path: "sceneLabel",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.sceneLabel",
      message: "sceneLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "showLineage",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.showLineage",
      message: "showLineage",
    },
    kind: "boolean",
  },
  {
    path: "showEquation",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.showEquation",
      message: "showEquation",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.specimen-aliquot-balance.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "source",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.copy.source",
          message: "source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "tubes",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.copy.tubes",
          message: "tubes",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "remainder",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.copy.remainder",
          message: "remainder",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "transferred",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.copy.transferred",
          message: "transferred",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "parentVolume",
        label: {
          id: "motionAtlas.specimen-aliquot-balance.controls.copy.parentVolume",
          message: "parentVolume",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
