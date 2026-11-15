import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors for every supplied field. */
export const CONTROLS: StockControl[] = [
  {
    path: "tests",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.tests",
      message: "Tests",
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
        inputLabel: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        expected: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        observed: {
          anyOf: [
            {
              type: "string",
              minLength: 1,
              maxLength: 20,
            },
            {
              type: "null",
            },
          ],
        },
      },
      required: ["id", "label", "inputLabel", "expected", "observed"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.tests.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.tests.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "inputLabel",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.tests.inputLabel",
          message: "Input label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "expected",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.tests.expected",
          message: "Expected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "observed",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.tests.observed",
          message: "Observed",
        },
        nullable: true,
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.labels",
      message: "Labels",
    },
    kind: "object",
    controls: [
      {
        path: "expected",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.labels.expected",
          message: "Expected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "observed",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.labels.observed",
          message: "Observed",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "match",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.labels.match",
          message: "Match",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "mismatch",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.labels.mismatch",
          message: "Mismatch",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "untested",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.labels.untested",
          message: "Untested",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "sheetMotion",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.sheetMotion",
      message: "Sheet motion",
    },
    kind: "select",
    options: [
      {
        value: "lower",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.sheetMotion.lower",
          message: "lower",
        },
      },
      {
        value: "hinge",
        label: {
          id: "motionAtlas.expectation-overlay-check.controls.sheetMotion.hinge",
          message: "hinge",
        },
      },
    ],
  },
  {
    path: "showInputs",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.showInputs",
      message: "Show inputs",
    },
    kind: "boolean",
  },
  {
    path: "showStateGlyphs",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.showStateGlyphs",
      message: "Show state glyphs",
    },
    kind: "boolean",
  },
  {
    path: "exampleLabel",
    label: {
      id: "motionAtlas.expectation-overlay-check.controls.exampleLabel",
      message: "Example label",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
