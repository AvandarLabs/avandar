import { z } from "zod";
import { inputSchema } from "./ColdChainCustody.schema";
import type { StockControl } from "../../contracts/StockContract.types";

function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.cold-chain-custody.controls.${path}`, message };
}
/** Complete recursive editors, including nullable and referenced values. */
export const controls: StockControl[] = [
  {
    path: "stops",
    label: _copy({ path: "stops", message: "Stops" }),
    kind: "collection",
    minItems: 3,
    maxItems: 3,
    itemSchema: z.toJSONSchema(inputSchema.shape.stops.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "stops.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "stops.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "kind",
        label: _copy({ path: "stops.kind", message: "Kind" }),
        kind: "select",
        options: [
          {
            value: "depot",
            label: _copy({ path: "stops.kind.depot", message: "Depot" }),
          },
          {
            value: "vehicle",
            label: _copy({ path: "stops.kind.vehicle", message: "Vehicle" }),
          },
          {
            value: "clinic",
            label: _copy({ path: "stops.kind.clinic", message: "Clinic" }),
          },
          {
            value: "collector",
            label: _copy({
              path: "stops.kind.collector",
              message: "Collector",
            }),
          },
          {
            value: "courier",
            label: _copy({ path: "stops.kind.courier", message: "Courier" }),
          },
          {
            value: "laboratory",
            label: _copy({
              path: "stops.kind.laboratory",
              message: "Laboratory",
            }),
          },
        ],
      },
    ],
  },
  {
    path: "crates",
    label: _copy({ path: "crates", message: "Crates" }),
    kind: "collection",
    minItems: 1,
    maxItems: 5,
    itemSchema: z.toJSONSchema(inputSchema.shape.crates.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "crates.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "crates.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "kind",
        label: _copy({ path: "crates.kind", message: "Kind" }),
        kind: "select",
        options: [
          {
            value: "carrier",
            label: _copy({ path: "crates.kind.carrier", message: "Carrier" }),
          },
          {
            value: "specimen",
            label: _copy({ path: "crates.kind.specimen", message: "Specimen" }),
          },
        ],
      },
      {
        path: "checkpoints",
        label: _copy({ path: "crates.checkpoints", message: "Checkpoints" }),
        kind: "collection",
        minItems: 3,
        maxItems: 3,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.crates.element.shape.checkpoints.element,
        ),
        itemControls: [
          {
            path: "stopId",
            label: _copy({
              path: "crates.checkpoints.stopId",
              message: "Stop id",
            }),
            kind: "select",
            optionsFrom: {
              path: "stops",
              valueKey: "id",
              labelKey: "label",
            },
          },
          {
            path: "state",
            label: _copy({
              path: "crates.checkpoints.state",
              message: "State",
            }),
            kind: "select",
            options: [
              {
                value: "logged",
                label: _copy({
                  path: "crates.checkpoints.state.logged",
                  message: "Logged",
                }),
              },
              {
                value: "review",
                label: _copy({
                  path: "crates.checkpoints.state.review",
                  message: "Review",
                }),
              },
              {
                value: "missing",
                label: _copy({
                  path: "crates.checkpoints.state.missing",
                  message: "Missing",
                }),
              },
            ],
          },
          {
            path: "acknowledged",
            label: _copy({
              path: "crates.checkpoints.acknowledged",
              message: "Acknowledged",
            }),
            kind: "boolean",
          },
          {
            path: "seal",
            label: _copy({ path: "crates.checkpoints.seal", message: "Seal" }),
            kind: "select",
            options: [
              {
                value: "intact",
                label: _copy({
                  path: "crates.checkpoints.seal.intact",
                  message: "Intact",
                }),
              },
              {
                value: "broken",
                label: _copy({
                  path: "crates.checkpoints.seal.broken",
                  message: "Broken",
                }),
              },
              {
                value: "unknown",
                label: _copy({
                  path: "crates.checkpoints.seal.unknown",
                  message: "Unknown",
                }),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "sceneLabel",
    label: _copy({ path: "sceneLabel", message: "Scene label" }),
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "geographyMode",
    label: _copy({ path: "geographyMode", message: "Geography mode" }),
    kind: "select",
    options: [
      {
        value: "globe-and-schematic",
        label: _copy({
          path: "geographyMode.globe-and-schematic",
          message: "Globe and schematic",
        }),
      },
      {
        value: "schematic-only",
        label: _copy({
          path: "geographyMode.schematic-only",
          message: "Schematic only",
        }),
      },
    ],
  },
  {
    path: "showMonitoring",
    label: _copy({ path: "showMonitoring", message: "Show monitoring" }),
    kind: "boolean",
  },
  {
    path: "showLedger",
    label: _copy({ path: "showLedger", message: "Show ledger" }),
    kind: "boolean",
  },
  {
    path: "copy",
    label: _copy({ path: "copy", message: "Copy" }),
    kind: "object",
    controls: [
      {
        path: "schematic",
        label: _copy({ path: "copy.schematic", message: "Schematic" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "total",
        label: _copy({ path: "copy.total", message: "Total" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "logged",
        label: _copy({ path: "copy.logged", message: "Logged" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "review",
        label: _copy({ path: "copy.review", message: "Review" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "missing",
        label: _copy({ path: "copy.missing", message: "Missing" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "arrival",
        label: _copy({ path: "copy.arrival", message: "Arrival" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "acknowledged",
        label: _copy({ path: "copy.acknowledged", message: "Acknowledged" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "receiptMissing",
        label: _copy({
          path: "copy.receiptMissing",
          message: "Receipt missing",
        }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "sealIntact",
        label: _copy({ path: "copy.sealIntact", message: "Seal intact" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "sealBroken",
        label: _copy({ path: "copy.sealBroken", message: "Seal broken" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "sealUnknown",
        label: _copy({ path: "copy.sealUnknown", message: "Seal unknown" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
  {
    path: "showIdentityRibbon",
    label: _copy({
      path: "showIdentityRibbon",
      message: "Show identity ribbon",
    }),
    kind: "boolean",
  },
];
