import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors preserve authored field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learnerLabel",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.learnerLabel",
      message: "learnerLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 20,
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.learnerLabel.help",
      message:
        "The persistent learner identity through both settings. 1..20 characters",
    },
  },
  {
    path: "settingLabels",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.settingLabels",
      message: "settingLabels",
    },
    kind: "object",
    controls: [
      {
        path: "practice",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.settingLabels.practice",
          message: "practice",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "application",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.settingLabels.application",
          message: "application",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.settingLabels.help",
      message:
        "Labels for the two schematic environments. Each label 1..26 characters",
    },
  },
  {
    path: "task",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.task",
      message: "task",
    },
    kind: "object",
    controls: [
      {
        path: "instruction",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.task.instruction",
          message: "instruction",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.task.value",
          message: "value",
        },
        kind: "number",
        min: 1,
        max: 10,
        step: 1,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.task.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 8,
      },
    ],
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.task.help",
      message:
        "The shared authored measurement repeated on both artifacts. Instruction 1..28 characters; value integer 1..10; unit 1..8 characters; the same value and unit appear on both artifacts; no conversion",
    },
  },
  {
    path: "workpieces",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.workpieces",
      message: "workpieces",
    },
    kind: "object",
    controls: [
      {
        path: "practiceLabel",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.workpieces.practiceLabel",
          message: "practiceLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "applicationLabel",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.workpieces.applicationLabel",
          message: "applicationLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "material",
        label: {
          id: "motionAtlas.practice-to-work-sample.controls.workpieces.material",
          message: "material",
        },
        kind: "select",
        options: [
          {
            value: "wood",
            label: {
              id: "motionAtlas.practice-to-work-sample.controls.workpieces.material.wood",
              message: "wood",
            },
          },
          {
            value: "fabric",
            label: {
              id: "motionAtlas.practice-to-work-sample.controls.workpieces.material.fabric",
              message: "fabric",
            },
          },
          {
            value: "card",
            label: {
              id: "motionAtlas.practice-to-work-sample.controls.workpieces.material.card",
              message: "card",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.workpieces.help",
      message:
        "Labels and the target material whose visual surface changes between settings. Each label 1..24 characters; material is one of the declared values; practice surface remains a sheet",
    },
  },
  {
    path: "showAlignmentGuides",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.showAlignmentGuides",
      message: "showAlignmentGuides",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.showAlignmentGuides.help",
      message:
        "Show the ruler zero point and the authored endpoint during each marking gesture. boolean; guides derive from the same task value and a normalized diagram scale",
    },
  },
  {
    path: "showFirstArtifactAtHold",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.showFirstArtifactAtHold",
      message: "showFirstArtifactAtHold",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.showFirstArtifactAtHold.help",
      message:
        "Retain the practice sheet next to the final application sample for visual correspondence. boolean; retaining the sheet does not create a second learner or another completed qualification",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.practice-to-work-sample.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.practice-to-work-sample.controls.caption.help",
      message: "Context for the staged skills example. 1..56 characters",
    },
  },
];
