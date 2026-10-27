import { z } from "zod";
import { inputSchema } from "./MobileClinicRelocation.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors preserve references and explicit nullable bookings. */
export const controls: StockControl[] = [
  {
    path: "sites",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.sites",
      message: "sites",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(inputSchema.shape.sites.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.sites.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.sites.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.sites.x",
          message: "x",
        },
        kind: "number",
        min: 0.15,
        max: 0.85,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.sites.y",
          message: "y",
        },
        kind: "number",
        min: 0.15,
        max: 0.85,
      },
    ],
  },
  {
    path: "slots",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.slots",
      message: "slots",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.slots.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.slots.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.slots.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 14,
      },
    ],
  },
  {
    path: "people",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.people",
      message: "people",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.people.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.people.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.people.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "slotId",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.people.slotId",
          message: "slotId",
        },
        kind: "select",
        optionsFrom: {
          path: "slots",
          valueKey: "id",
          labelKey: "label",
        },
        nullable: true,
      },
    ],
  },
  {
    path: "sceneLabel",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.sceneLabel",
      message: "sceneLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "showSlotLedger",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.showSlotLedger",
      message: "showSlotLedger",
    },
    kind: "boolean",
  },
  {
    path: "view",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.view",
      message: "view",
    },
    kind: "select",
    options: [
      {
        value: "local-map",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.view.local-map",
          message: "local-map",
        },
      },
      {
        value: "globe-to-local",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.view.globe-to-local",
          message: "globe-to-local",
        },
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.mobile-clinic-relocation.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "map",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.map",
          message: "map",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "people",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.people",
          message: "people",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "booked",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.booked",
          message: "booked",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unbooked",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.unbooked",
          message: "unbooked",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "slots",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.slots",
          message: "slots",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "open",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.open",
          message: "open",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "clinic",
        label: {
          id: "motionAtlas.mobile-clinic-relocation.controls.copy.clinic",
          message: "clinic",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
