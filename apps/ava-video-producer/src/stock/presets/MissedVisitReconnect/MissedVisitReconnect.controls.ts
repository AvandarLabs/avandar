import { z } from "zod";
import { inputSchema } from "./MissedVisitReconnect.schema";
import type { StockControl } from "../../contracts/StockContract.types";
function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.missed-visit-reconnect.controls.${path}`, message };
}
/** Complete recursive editors, including nullable and referenced values. */
export const controls: StockControl[] = [
  {
    path: "cases",
    label: _copy({ path: "cases", message: "Cases" }),
    kind: "collection",
    minItems: 1,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.cases.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "cases.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "cases.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "channel",
        label: _copy({ path: "cases.channel", message: "Channel" }),
        kind: "select",
        options: [
          {
            value: "phone",
            label: _copy({ path: "cases.channel.phone", message: "Phone" }),
          },
          {
            value: "doorstep",
            label: _copy({
              path: "cases.channel.doorstep",
              message: "Doorstep",
            }),
          },
        ],
      },
      {
        path: "attempts",
        label: _copy({ path: "cases.attempts", message: "Attempts" }),
        kind: "number",
        min: 1,
        max: 3,
        step: 1,
      },
      {
        path: "outcome",
        label: _copy({ path: "cases.outcome", message: "Outcome" }),
        kind: "select",
        options: [
          {
            value: "unreached",
            label: _copy({
              path: "cases.outcome.unreached",
              message: "Unreached",
            }),
          },
          {
            value: "contacted",
            label: _copy({
              path: "cases.outcome.contacted",
              message: "Contacted",
            }),
          },
          {
            value: "booked",
            label: _copy({ path: "cases.outcome.booked", message: "Booked" }),
          },
          {
            value: "attended",
            label: _copy({
              path: "cases.outcome.attended",
              message: "Attended",
            }),
          },
        ],
      },
    ],
  },
  {
    path: "places",
    label: _copy({ path: "places", message: "Places" }),
    kind: "object",
    controls: [
      {
        path: "homeLabel",
        label: _copy({ path: "places.homeLabel", message: "Home label" }),
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "clinicLabel",
        label: _copy({ path: "places.clinicLabel", message: "Clinic label" }),
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "calendarLabel",
        label: _copy({
          path: "places.calendarLabel",
          message: "Calendar label",
        }),
        kind: "text",
        minLength: 1,
        maxLength: 24,
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
    path: "showAttemptCount",
    label: _copy({ path: "showAttemptCount", message: "Show attempt count" }),
    kind: "boolean",
  },
  {
    path: "showOutcomeLedger",
    label: _copy({ path: "showOutcomeLedger", message: "Show outcome ledger" }),
    kind: "boolean",
  },
  {
    path: "copy",
    label: _copy({ path: "copy", message: "Copy" }),
    kind: "object",
    controls: [
      {
        path: "group",
        label: _copy({ path: "copy.group", message: "Group" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "attempts",
        label: _copy({ path: "copy.attempts", message: "Attempts" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unreached",
        label: _copy({ path: "copy.unreached", message: "Unreached" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "contacted",
        label: _copy({ path: "copy.contacted", message: "Contacted" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "booked",
        label: _copy({ path: "copy.booked", message: "Booked" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "attended",
        label: _copy({ path: "copy.attended", message: "Attended" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
