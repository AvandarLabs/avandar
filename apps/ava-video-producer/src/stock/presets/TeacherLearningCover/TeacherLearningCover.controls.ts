import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editors preserve all authored collection and field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "staff",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.staff",
      message: "staff",
    },
    kind: "object",
    controls: [
      {
        path: "teacher",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.staff.teacher",
          message: "teacher",
        },
        kind: "object",
        controls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.teacher.id",
              message: "id",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.teacher.label",
              message: "label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
        ],
      },
      {
        path: "cover",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.staff.cover",
          message: "cover",
        },
        kind: "object",
        controls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.cover.id",
              message: "id",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.cover.label",
              message: "label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
        ],
      },
      {
        path: "mentor",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.staff.mentor",
          message: "mentor",
        },
        kind: "object",
        controls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.mentor.id",
              message: "id",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.staff.mentor.label",
              message: "label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 20,
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.staff.help",
      message:
        "The three distinct adults and their fixed roles in this example. Exactly three distinct IDs 1..20 characters; labels 1..20 characters; no role doubles as another role during the same beat",
    },
  },
  {
    path: "learners",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
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
          maxLength: 16,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.learners.help",
      message:
        "The same represented learners remain in the classroom during the support session. 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters",
    },
  },
  {
    path: "session",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.session",
      message: "session",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.session.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "mode",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.session.mode",
          message: "mode",
        },
        kind: "select",
        options: [
          {
            value: "rehearsal",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.session.mode.rehearsal",
              message: "rehearsal",
            },
          },
          {
            value: "co-planning",
            label: {
              id: "motionAtlas.teacher-learning-cover.controls.session.mode.co-planning",
              message: "co planning",
            },
          },
        ],
      },
      {
        path: "prompt",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.session.prompt",
          message: "prompt",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
    ],
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.session.help",
      message:
        "The authored teacher-support activity and visible prompt. Label 1..24 characters; prompt 1..40 characters; mode determines a short board rehearsal or shared planning gesture",
    },
  },
  {
    path: "roomLabels",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.roomLabels",
      message: "roomLabels",
    },
    kind: "object",
    controls: [
      {
        path: "classroom",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.roomLabels.classroom",
          message: "classroom",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "supportSpace",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.roomLabels.supportSpace",
          message: "supportSpace",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.roomLabels.help",
      message:
        "The two schematic physical locations. Each label 1..24 characters",
    },
  },
  {
    path: "phaseLabels",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.phaseLabels",
      message: "phaseLabels",
    },
    kind: "object",
    controls: [
      {
        path: "cover",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.phaseLabels.cover",
          message: "cover",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "support",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.phaseLabels.support",
          message: "support",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "return",
        label: {
          id: "motionAtlas.teacher-learning-cover.controls.phaseLabels.return",
          message: "return",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.phaseLabels.help",
      message:
        "Labels attached to the three authored handoff beats. Each label 1..24 characters",
    },
  },
  {
    path: "showClassroomResponsibility",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.showClassroomResponsibility",
      message: "showClassroomResponsibility",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.showClassroomResponsibility.help",
      message:
        "Keep a short bracket between the adult currently attending the class and its learner area. boolean; bracket changes only after the arriving adult is in place",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.teacher-learning-cover.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
    help: {
      id: "motionAtlas.teacher-learning-cover.controls.caption.help",
      message: "Illustrative context for the example. 1..48 characters",
    },
  },
];
