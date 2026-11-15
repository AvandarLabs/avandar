import { z } from "zod";
import { inputSchema } from "./OutreachHouseholdRevisits.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors preserve references and explicit nullable bookings. */
export const controls: StockControl[] = [
  {
    path: "households",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.households",
      message: "households",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.households.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.households.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.households.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.households.x",
          message: "x",
        },
        kind: "number",
        min: 0.1,
        max: 0.9,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.households.y",
          message: "y",
        },
        kind: "number",
        min: 0.1,
        max: 0.9,
      },
    ],
  },
  {
    path: "visits",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.visits",
      message: "visits",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.visits.element),
    itemControls: [
      {
        path: "householdId",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.visits.householdId",
          message: "householdId",
        },
        kind: "select",
        optionsFrom: {
          path: "households",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "contacted",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.visits.contacted",
          message: "contacted",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "sceneLabel",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.sceneLabel",
      message: "sceneLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "showVisitStamps",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.showVisitStamps",
      message: "showVisitStamps",
    },
    kind: "boolean",
  },
  {
    path: "showUniqueLedger",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.showUniqueLedger",
      message: "showUniqueLedger",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.outreach-household-revisits.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "map",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.map",
          message: "map",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "visits",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.visits",
          message: "visits",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "visited",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.visited",
          message: "visited",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "contacted",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.contacted",
          message: "contacted",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "noContact",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.noContact",
          message: "noContact",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unvisited",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.unvisited",
          message: "unvisited",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "denominator",
        label: {
          id: "motionAtlas.outreach-household-revisits.controls.copy.denominator",
          message: "denominator",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
