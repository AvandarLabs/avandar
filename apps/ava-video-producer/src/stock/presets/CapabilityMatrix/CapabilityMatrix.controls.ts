import { z } from "zod";
import {
  capabilitySchema,
  cellSchema,
  optionSchema,
} from "./CapabilityMatrix.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve complete authored inputs. */
export const controls: StockControl[] = [
  {
    path: "options",
    label: {
      id: "motionAtlas.capability-matrix.controls.options",
      message: "options",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: z.toJSONSchema(optionSchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.capability-matrix.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.capability-matrix.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "capabilities",
    label: {
      id: "motionAtlas.capability-matrix.controls.capabilities",
      message: "capabilities",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 5,
    itemSchema: z.toJSONSchema(capabilitySchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.capability-matrix.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.capability-matrix.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "cells",
        label: {
          id: "motionAtlas.capability-matrix.controls.cells",
          message: "cells",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 3,
        itemSchema: z.toJSONSchema(cellSchema),
        itemControls: [
          {
            path: "optionId",
            label: {
              id: "motionAtlas.capability-matrix.controls.optionId",
              message: "optionId",
            },
            kind: "select",
            optionsFrom: {
              path: "options",
              valueKey: "id",
              labelKey: "label",
            },
          },
          {
            path: "state",
            label: {
              id: "motionAtlas.capability-matrix.controls.state",
              message: "state",
            },
            kind: "select",
            options: [
              {
                value: "included",
                label: {
                  id: "motionAtlas.capability-matrix.options.included",
                  message: "included",
                },
              },
              {
                value: "absent",
                label: {
                  id: "motionAtlas.capability-matrix.options.absent",
                  message: "absent",
                },
              },
              {
                value: "conditional",
                label: {
                  id: "motionAtlas.capability-matrix.options.conditional",
                  message: "conditional",
                },
              },
              {
                value: "unknown",
                label: {
                  id: "motionAtlas.capability-matrix.options.unknown",
                  message: "unknown",
                },
              },
            ],
          },
          {
            path: "note",
            label: {
              id: "motionAtlas.capability-matrix.controls.note",
              message: "note",
            },
            kind: "text",
            minLength: 0,
            maxLength: 18,
          },
        ],
      },
    ],
  },
  {
    path: "stateLabels",
    label: {
      id: "motionAtlas.capability-matrix.controls.stateLabels",
      message: "stateLabels",
    },
    kind: "object",
    controls: [
      {
        path: "included",
        label: {
          id: "motionAtlas.capability-matrix.controls.included",
          message: "included",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
      {
        path: "absent",
        label: {
          id: "motionAtlas.capability-matrix.controls.absent",
          message: "absent",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
      {
        path: "conditional",
        label: {
          id: "motionAtlas.capability-matrix.controls.conditional",
          message: "conditional",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
      {
        path: "unknown",
        label: {
          id: "motionAtlas.capability-matrix.controls.unknown",
          message: "unknown",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
    ],
  },
  {
    path: "focus",
    label: {
      id: "motionAtlas.capability-matrix.controls.focus",
      message: "focus",
    },
    kind: "object",
    controls: [
      {
        path: "kind",
        label: {
          id: "motionAtlas.capability-matrix.controls.kind",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "row",
            label: {
              id: "motionAtlas.capability-matrix.options.row",
              message: "row",
            },
          },
          {
            value: "column",
            label: {
              id: "motionAtlas.capability-matrix.options.column",
              message: "column",
            },
          },
          {
            value: "none",
            label: {
              id: "motionAtlas.capability-matrix.options.none",
              message: "none",
            },
          },
        ],
      },
      {
        path: "id",
        label: {
          id: "motionAtlas.capability-matrix.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
    ],
  },
  {
    path: "showNotes",
    label: {
      id: "motionAtlas.capability-matrix.controls.showNotes",
      message: "showNotes",
    },
    kind: "boolean",
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.capability-matrix.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 0,
    maxLength: 48,
  },
];
