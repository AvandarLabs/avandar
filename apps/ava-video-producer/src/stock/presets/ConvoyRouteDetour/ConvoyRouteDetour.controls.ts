import { z } from "zod";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive authoring controls. */
export const controls: StockControl[] = [
  {
    path: "locations",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.locations.label",
      message: "locations",
    },
    kind: "object",
    controls: [
      {
        path: "depotLabel",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.locations.depotLabel.label",
          message: "depotLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "destinationLabel",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.locations.destinationLabel.label",
          message: "destinationLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "junctionLabel",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.locations.junctionLabel.label",
          message: "junctionLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
    ],
  },
  {
    path: "routes",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.routes.label",
      message: "routes",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        label: z.string().min(0).max(24),
        role: z.enum(["blocked", "detour"]),
        points: z
          .array(
            z.strictObject({
              x: z.number().finite().min(0.1).max(0.9),
              y: z.number().finite().min(0.1).max(0.9),
            }),
          )
          .min(4)
          .max(6),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.routes.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.routes.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "role",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.routes.item.role.label",
          message: "role",
        },
        kind: "select",
        options: [
          {
            value: "blocked",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.routes.item.role.blocked",
              message: "blocked",
            },
          },
          {
            value: "detour",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.routes.item.role.detour",
              message: "detour",
            },
          },
        ],
      },
      {
        path: "points",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.routes.item.points.label",
          message: "points",
        },
        kind: "collection",
        minItems: 4,
        maxItems: 6,
        itemSchema: z.toJSONSchema(
          z.strictObject({
            x: z.number().finite().min(0.1).max(0.9),
            y: z.number().finite().min(0.1).max(0.9),
          }),
        ),
        itemControls: [
          {
            path: "x",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.routes.item.points.item.x.label",
              message: "x",
            },
            kind: "number",
            min: 0.1,
            max: 0.9,
            step: 0.01,
          },
          {
            path: "y",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.routes.item.points.item.y.label",
              message: "y",
            },
            kind: "number",
            min: 0.1,
            max: 0.9,
            step: 0.01,
          },
        ],
      },
    ],
  },
  {
    path: "obstruction",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.obstruction.label",
      message: "obstruction",
    },
    kind: "object",
    controls: [
      {
        path: "segmentIndex",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.obstruction.segmentIndex.label",
          message: "segmentIndex",
        },
        kind: "number",
        min: 1,
        max: 4,
        step: 1,
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.obstruction.kind.label",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "barrier",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.obstruction.kind.barrier",
              message: "barrier",
            },
          },
          {
            value: "bridge-closure",
            label: {
              id: "motionAtlas.convoy-route-detour.controls.obstruction.kind.bridge-closure",
              message: "bridge-closure",
            },
          },
        ],
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.obstruction.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
    ],
  },
  {
    path: "vehicle",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.vehicle.label",
      message: "vehicle",
    },
    kind: "select",
    options: [
      {
        value: "truck",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.vehicle.truck",
          message: "truck",
        },
      },
      {
        value: "cargo-bike",
        label: {
          id: "motionAtlas.convoy-route-detour.controls.vehicle.cargo-bike",
          message: "cargo-bike",
        },
      },
    ],
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
  {
    path: "showRouteLabels",
    label: {
      id: "motionAtlas.convoy-route-detour.controls.showRouteLabels.label",
      message: "showRouteLabels",
    },
    kind: "boolean",
  },
];
