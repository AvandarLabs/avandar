import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for commitments. */
export const COMMITMENTS_CONTROL: StockControl = {
  path: "commitments",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.commitments",
    message: "commitments",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 5,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 16,
      },
      label: {
        type: "string",
        maxLength: 22,
      },
      kind: {
        enum: ["existing", "support"],
      },
      initialDayId: {
        type: "string",
        maxLength: 16,
      },
      initialBandId: {
        type: "string",
        maxLength: 16,
      },
      agreedDayId: {
        type: "string",
        maxLength: 16,
      },
      agreedBandId: {
        type: "string",
        maxLength: 16,
      },
    },
    required: [
      "id",
      "label",
      "kind",
      "initialDayId",
      "initialBandId",
      "agreedDayId",
      "agreedBandId",
    ],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 22,
    },
    {
      path: "kind",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.kind",
        message: "kind",
      },
      kind: "select",
      options: [
        {
          value: "existing",
          label: {
            id: "motionAtlas.person-led-support-calendar.controls.commitments.kind.existing",
            message: "existing",
          },
        },
        {
          value: "support",
          label: {
            id: "motionAtlas.person-led-support-calendar.controls.commitments.kind.support",
            message: "support",
          },
        },
      ],
    },
    {
      path: "initialDayId",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.initialDayId",
        message: "initialDayId",
      },
      kind: "select",
      optionsFrom: {
        path: "days",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "initialBandId",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.initialBandId",
        message: "initialBandId",
      },
      kind: "select",
      optionsFrom: {
        path: "timeBands",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "agreedDayId",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.agreedDayId",
        message: "agreedDayId",
      },
      kind: "select",
      optionsFrom: {
        path: "days",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "agreedBandId",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.commitments.agreedBandId",
        message: "agreedBandId",
      },
      kind: "select",
      optionsFrom: {
        path: "timeBands",
        valueKey: "id",
        labelKey: "label",
      },
    },
  ],
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.commitments.help",
    message:
      "Supply existing commitments and the appointment's authored move. 2..5 commitments; unique IDs <= 16 characters; labels <= 22 characters; references must exist; exactly one support item; existing items retain positions; final cells cannot overlap. The support item must initially overlap an existing commitment, then move to a different, unoccupied agreed cell.",
  },
};
