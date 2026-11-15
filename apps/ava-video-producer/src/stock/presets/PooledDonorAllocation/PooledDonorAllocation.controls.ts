import { z } from "zod";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive authoring controls. */
export const controls: StockControl[] = [
  {
    path: "requests",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.requests.label",
      message: "requests",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        label: z.string().min(0).max(28),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.requests.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.requests.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
    ],
  },
  {
    path: "contributions",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.contributions.label",
      message: "contributions",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        donorLabel: z.string().min(0).max(24),
        mark: z.string().min(1).max(2),
        credits: z.number().finite().int().min(1).max(5),
        earmarkedRequestId: z.string().min(0).max(24).nullable(),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.contributions.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "donorLabel",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.contributions.item.donorLabel.label",
          message: "donorLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "mark",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.contributions.item.mark.label",
          message: "mark",
        },
        kind: "text",
        minLength: 1,
        maxLength: 2,
      },
      {
        path: "credits",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.contributions.item.credits.label",
          message: "credits",
        },
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
      {
        path: "earmarkedRequestId",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.contributions.item.earmarkedRequestId.label",
          message: "earmarkedRequestId",
        },
        kind: "select",
        optionsFrom: {
          path: "requests",
          valueKey: "id",
          labelKey: "label",
        },
        nullable: true,
      },
    ],
  },
  {
    path: "allocations",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.allocations.label",
      message: "allocations",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 8,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        contributionId: z.string().min(0).max(24),
        requestId: z.string().min(0).max(24),
        credits: z.number().finite().int().min(1).max(5),
      }),
    ),
    itemControls: [
      {
        path: "contributionId",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.allocations.item.contributionId.label",
          message: "contributionId",
        },
        kind: "select",
        optionsFrom: {
          path: "contributions",
          valueKey: "id",
          labelKey: "donorLabel",
        },
      },
      {
        path: "requestId",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.allocations.item.requestId.label",
          message: "requestId",
        },
        kind: "select",
        optionsFrom: {
          path: "requests",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "credits",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.allocations.item.credits.label",
          message: "credits",
        },
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.labels.label",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "coordinator",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.coordinator.label",
          message: "coordinator",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "pool",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.pool.label",
          message: "pool",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "earmarked",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.earmarked.label",
          message: "earmarked",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "flexible",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.flexible.label",
          message: "flexible",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "allocated",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.allocated.label",
          message: "allocated",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "remaining",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.remaining.label",
          message: "remaining",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.labels.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
    ],
  },
  {
    path: "showAllocationTotals",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.showAllocationTotals.label",
      message: "showAllocationTotals",
    },
    kind: "boolean",
  },
  {
    path: "envelopeArrangement",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.envelopeArrangement.label",
      message: "envelopeArrangement",
    },
    kind: "select",
    options: [
      {
        value: "fan",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.envelopeArrangement.fan",
          message: "fan",
        },
      },
      {
        value: "side-by-side",
        label: {
          id: "motionAtlas.pooled-donor-allocation.controls.envelopeArrangement.side-by-side",
          message: "side-by-side",
        },
      },
    ],
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.pooled-donor-allocation.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
