import { z } from "zod";
import { inputSchema } from "./DoseCohortReturnPaths.schema";
import type { StockControl } from "../../contracts/StockContract.types";
function _copy({ path, message }: { path: string; message: string }) {
  return {
    id: `motionAtlas.dose-cohort-return-paths.controls.${path}`,
    message,
  };
}
/** Complete recursive editors, including nullable and referenced values. */
export const controls: StockControl[] = [
  {
    path: "visits",
    label: _copy({ path: "visits", message: "Visits" }),
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.visits.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "visits.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "visits.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
    ],
  },
  {
    path: "participants",
    label: _copy({ path: "participants", message: "Participants" }),
    kind: "collection",
    minItems: 2,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.participants.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "participants.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "participants.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "records",
        label: _copy({ path: "participants.records", message: "Records" }),
        kind: "collection",
        minItems: 2,
        maxItems: 4,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.participants.element.shape.records.element,
        ),
        itemControls: [
          {
            path: "visitId",
            label: _copy({
              path: "participants.records.visitId",
              message: "Visit id",
            }),
            kind: "select",
            optionsFrom: {
              path: "visits",
              valueKey: "id",
              labelKey: "label",
            },
          },
          {
            path: "state",
            label: _copy({
              path: "participants.records.state",
              message: "State",
            }),
            kind: "select",
            options: [
              {
                value: "recorded",
                label: _copy({
                  path: "participants.records.state.recorded",
                  message: "Recorded",
                }),
              },
              {
                value: "missed",
                label: _copy({
                  path: "participants.records.state.missed",
                  message: "Missed",
                }),
              },
              {
                value: "not-due",
                label: _copy({
                  path: "participants.records.state.not-due",
                  message: "Not due",
                }),
              },
              {
                value: "unknown",
                label: _copy({
                  path: "participants.records.state.unknown",
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
    path: "emphasis",
    label: _copy({ path: "emphasis", message: "Emphasis" }),
    kind: "select",
    options: [
      {
        value: "all-records",
        label: _copy({ path: "emphasis.all-records", message: "All records" }),
      },
      {
        value: "missed-and-returned",
        label: _copy({
          path: "emphasis.missed-and-returned",
          message: "Missed and returned",
        }),
      },
      {
        value: "unknown-records",
        label: _copy({
          path: "emphasis.unknown-records",
          message: "Unknown records",
        }),
      },
    ],
  },
  {
    path: "showFractions",
    label: _copy({ path: "showFractions", message: "Show fractions" }),
    kind: "boolean",
  },
  {
    path: "copy",
    label: _copy({ path: "copy", message: "Copy" }),
    kind: "object",
    controls: [
      {
        path: "baseline",
        label: _copy({ path: "copy.baseline", message: "Baseline" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "recorded",
        label: _copy({ path: "copy.recorded", message: "Recorded" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "missed",
        label: _copy({ path: "copy.missed", message: "Missed" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "notDue",
        label: _copy({ path: "copy.notDue", message: "Not due" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unknown",
        label: _copy({ path: "copy.unknown", message: "Unknown" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "retained",
        label: _copy({ path: "copy.retained", message: "Retained" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
