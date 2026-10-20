import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve literal accepted field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learners",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 8,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 16 },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
    help: {
      id: "motionAtlas.classroom-day-presence.controls.learners.help",
      message:
        "The fixed roster. Each entry owns exactly one desk and one persistent learner identity. 3..8 learners; unique IDs 1..20 characters; labels 1..16 characters",
    },
  },
  {
    path: "days",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.days",
      message: "days",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 16 },
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              learnerId: { type: "string", minLength: 1, maxLength: 20 },
              state: { type: "string", enum: ["present", "absent", "unknown"] },
            },
            required: ["learnerId", "state"],
            additionalProperties: false,
          },
          minItems: 3,
          maxItems: 8,
        },
      },
      required: ["id", "label", "records"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.days.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.days.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "records",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.days.records",
          message: "records",
        },
        kind: "collection",
        minItems: 3,
        maxItems: 8,
        itemSchema: {
          type: "object",
          properties: {
            learnerId: { type: "string", minLength: 1, maxLength: 20 },
            state: { type: "string", enum: ["present", "absent", "unknown"] },
          },
          required: ["learnerId", "state"],
          additionalProperties: false,
        },
        itemControls: [
          {
            path: "learnerId",
            label: {
              id: "motionAtlas.classroom-day-presence.controls.days.records.learnerId",
              message: "learnerId",
            },
            kind: "select",
            optionsFrom: {
              path: "learners",
              valueKey: "id",
              labelKey: "label",
            },
          },
          {
            path: "state",
            label: {
              id: "motionAtlas.classroom-day-presence.controls.days.records.state",
              message: "state",
            },
            kind: "select",
            options: [
              {
                value: "present",
                label: {
                  id: "motionAtlas.classroom-day-presence.options.days.records.state.present",
                  message: "present",
                },
              },
              {
                value: "absent",
                label: {
                  id: "motionAtlas.classroom-day-presence.options.days.records.state.absent",
                  message: "absent",
                },
              },
              {
                value: "unknown",
                label: {
                  id: "motionAtlas.classroom-day-presence.options.days.records.state.unknown",
                  message: "unknown",
                },
              },
            ],
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.classroom-day-presence.controls.days.help",
      message:
        "Authored daily attendance, played in array order with no inferred interpolation between days. 2..3 days; unique IDs 1..20 characters; day labels 1..16 characters; each day must contain exactly one record for every learner ID; the roster is unchanged",
    },
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "present",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.labels.present",
          message: "present",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "absent",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.labels.absent",
          message: "absent",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "unknown",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.labels.unknown",
          message: "unknown",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "roster",
        label: {
          id: "motionAtlas.classroom-day-presence.controls.labels.roster",
          message: "roster",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
    help: {
      id: "motionAtlas.classroom-day-presence.controls.labels.help",
      message:
        "Visible legend and denominator wording. Each label 1..18 characters",
    },
  },
  {
    path: "deskLayout",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.deskLayout",
      message: "deskLayout",
    },
    kind: "select",
    options: [
      {
        value: "two-rows",
        label: {
          id: "motionAtlas.classroom-day-presence.options.deskLayout.two-rows",
          message: "two-rows",
        },
      },
      {
        value: "horseshoe",
        label: {
          id: "motionAtlas.classroom-day-presence.options.deskLayout.horseshoe",
          message: "horseshoe",
        },
      },
    ],
    help: {
      id: "motionAtlas.classroom-day-presence.controls.deskLayout.help",
      message:
        "The physical classroom arrangement, without changing learner IDs or attendance. One of the declared values",
    },
  },
  {
    path: "showDayImpressions",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.showDayImpressions",
      message: "showDayImpressions",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.classroom-day-presence.controls.showDayImpressions.help",
      message:
        "Keep small previous-day marks at each desk so the viewer can compare the same learner across days. boolean; marks use both shape and legend labels",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.classroom-day-presence.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
    help: {
      id: "motionAtlas.classroom-day-presence.controls.caption.help",
      message: "Persistent context identifying the example. 1..48 characters",
    },
  },
];
