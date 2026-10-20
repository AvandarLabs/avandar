import { z } from "zod";
import { inputSchema } from "./VaccinationSessionBalance.schema";
import type { StockControl } from "../../contracts/StockContract.types";
function _copy({ path, message }: { path: string; message: string }) {
  return {
    id: `motionAtlas.vaccination-session-balance.controls.${path}`,
    message,
  };
}
/** Complete recursive editors, including nullable and referenced values. */
export const controls: StockControl[] = [
  {
    path: "units",
    label: _copy({ path: "units", message: "Units" }),
    kind: "collection",
    minItems: 1,
    maxItems: 12,
    itemSchema: z.toJSONSchema(inputSchema.shape.units.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "units.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "outcome",
        label: _copy({ path: "units.outcome", message: "Outcome" }),
        kind: "select",
        options: [
          {
            value: "administered",
            label: _copy({
              path: "units.outcome.administered",
              message: "Administered",
            }),
          },
          {
            value: "remaining",
            label: _copy({
              path: "units.outcome.remaining",
              message: "Remaining",
            }),
          },
          {
            value: "discarded",
            label: _copy({
              path: "units.outcome.discarded",
              message: "Discarded",
            }),
          },
        ],
      },
      {
        path: "recipientId",
        label: _copy({ path: "units.recipientId", message: "Recipient id" }),
        nullable: true,
        kind: "select",
        optionsFrom: {
          path: "recipients",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "recipients",
    label: _copy({ path: "recipients", message: "Recipients" }),
    kind: "collection",
    minItems: 0,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.recipients.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "recipients.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "recipients.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 18,
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
    path: "showPeopleTotal",
    label: _copy({ path: "showPeopleTotal", message: "Show people total" }),
    kind: "boolean",
  },
  {
    path: "showEquation",
    label: _copy({ path: "showEquation", message: "Show equation" }),
    kind: "boolean",
  },
  {
    path: "copy",
    label: _copy({ path: "copy", message: "Copy" }),
    kind: "object",
    controls: [
      {
        path: "opening",
        label: _copy({ path: "copy.opening", message: "Opening" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "administered",
        label: _copy({ path: "copy.administered", message: "Administered" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "remaining",
        label: _copy({ path: "copy.remaining", message: "Remaining" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "discarded",
        label: _copy({ path: "copy.discarded", message: "Discarded" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "people",
        label: _copy({ path: "copy.people", message: "People" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unit",
        label: _copy({ path: "copy.unit", message: "Unit" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
