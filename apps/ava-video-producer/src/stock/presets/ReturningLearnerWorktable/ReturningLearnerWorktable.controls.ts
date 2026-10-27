import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editors preserve all authored collection and field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "people",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.people",
      message: "people",
    },
    kind: "object",
    controls: [
      {
        path: "learner",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.people.learner",
          message: "learner",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "teacher",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.people.teacher",
          message: "teacher",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.people.help",
      message:
        "Names for the two participants in the fictional return session. Each label 1..20 characters",
    },
  },
  {
    path: "periodLabels",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.periodLabels",
      message: "periodLabels",
    },
    kind: "object",
    controls: [
      {
        path: "before",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.periodLabels.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "interruption",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.periodLabels.interruption",
          message: "interruption",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "return",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.periodLabels.return",
          message: "return",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.periodLabels.help",
      message:
        "The three ordered time labels. They carry no implicit duration or cause. Each label 1..24 characters",
    },
  },
  {
    path: "priorWork",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.priorWork",
      message: "priorWork",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        form: {
          type: "string",
          enum: ["drawing", "writing", "number-work"],
        },
      },
      required: ["id", "label", "form"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.priorWork.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.priorWork.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "form",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.priorWork.form",
          message: "form",
        },
        kind: "select",
        options: [
          {
            value: "drawing",
            label: {
              id: "motionAtlas.returning-learner-worktable.controls.priorWork.form.drawing",
              message: "drawing",
            },
          },
          {
            value: "writing",
            label: {
              id: "motionAtlas.returning-learner-worktable.controls.priorWork.form.writing",
              message: "writing",
            },
          },
          {
            value: "number-work",
            label: {
              id: "motionAtlas.returning-learner-worktable.controls.priorWork.form.number-work",
              message: "number work",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.priorWork.help",
      message:
        "Persistent artifacts carried through every scene beat. Their content is schematic and is never scored. 1..3 items; unique IDs 1..20 characters; labels 1..24 characters",
    },
  },
  {
    path: "returnActivities",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.returnActivities",
      message: "returnActivities",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 28,
        },
        kind: {
          type: "string",
          enum: ["review", "new"],
        },
        priorWorkId: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
      },
      required: ["id", "label", "kind", "priorWorkId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.returnActivities.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.returnActivities.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.returnActivities.kind",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "review",
            label: {
              id: "motionAtlas.returning-learner-worktable.controls.returnActivities.kind.review",
              message: "review",
            },
          },
          {
            value: "new",
            label: {
              id: "motionAtlas.returning-learner-worktable.controls.returnActivities.kind.new",
              message: "new",
            },
          },
        ],
      },
      {
        path: "priorWorkId",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.returnActivities.priorWorkId",
          message: "priorWorkId",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.returnActivities.help",
      message:
        "The teacher-authored activities placed beside the retained work at return. 1..3 activities; unique IDs 1..20 characters; labels 1..28 characters; review references an existing priorWork ID; new uses an empty priorWorkId; activity kind does not encode ability or grade",
    },
  },
  {
    path: "activityLabels",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.activityLabels",
      message: "activityLabels",
    },
    kind: "object",
    controls: [
      {
        path: "retained",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.activityLabels.retained",
          message: "retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "review",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.activityLabels.review",
          message: "review",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "new",
        label: {
          id: "motionAtlas.returning-learner-worktable.controls.activityLabels.new",
          message: "new",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.activityLabels.help",
      message:
        "Labels for the distinct purposes of the visible materials. Each label 1..24 characters",
    },
  },
  {
    path: "showPortfolioTrail",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.showPortfolioTrail",
      message: "showPortfolioTrail",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.showPortfolioTrail.help",
      message:
        "Keep a subtle persistent outline of the same portfolio during the move away and back. boolean; no duplicate learner or work-sample counts",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.returning-learner-worktable.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
    help: {
      id: "motionAtlas.returning-learner-worktable.controls.caption.help",
      message: "Persistent illustrative context. 1..48 characters",
    },
  },
];
