import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for complete authored documents. */
export const CONTROLS: StockControl[] = [
  {
    path: "summary",
    label: {
      id: "motionAtlas.provenance-peelback.controls.summary",
      message: "summary",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.provenance-peelback.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
        multiline: true,
      },
      {
        path: "text",
        label: {
          id: "motionAtlas.provenance-peelback.controls.text",
          message: "text",
        },
        kind: "text",
        minLength: 1,
        maxLength: 82,
        multiline: true,
      },
    ],
  },
  {
    path: "sources",
    label: {
      id: "motionAtlas.provenance-peelback.controls.sources",
      message: "sources",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 18,
        },
        title: {
          type: "string",
          minLength: 0,
          maxLength: 30,
        },
        locator: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        excerpt: {
          type: "string",
          minLength: 0,
          maxLength: 78,
        },
      },
      required: ["id", "title", "locator", "excerpt"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.provenance-peelback.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
      {
        path: "title",
        label: {
          id: "motionAtlas.provenance-peelback.controls.title",
          message: "title",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
        multiline: true,
      },
      {
        path: "locator",
        label: {
          id: "motionAtlas.provenance-peelback.controls.locator",
          message: "locator",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "excerpt",
        label: {
          id: "motionAtlas.provenance-peelback.controls.excerpt",
          message: "excerpt",
        },
        kind: "text",
        minLength: 0,
        maxLength: 78,
        multiline: true,
      },
    ],
  },
  {
    path: "selectedSourceId",
    label: {
      id: "motionAtlas.provenance-peelback.controls.selectedSourceId",
      message: "selectedSourceId",
    },
    kind: "select",
    optionsFrom: {
      path: "sources",
      valueKey: "id",
      labelKey: "title",
    },
  },
  {
    path: "citationLabel",
    label: {
      id: "motionAtlas.provenance-peelback.controls.citationLabel",
      message: "citationLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
    multiline: true,
  },
  {
    path: "showLocators",
    label: {
      id: "motionAtlas.provenance-peelback.controls.showLocators",
      message: "showLocators",
    },
    kind: "boolean",
  },
  {
    path: "sourceArrangement",
    label: {
      id: "motionAtlas.provenance-peelback.controls.sourceArrangement",
      message: "sourceArrangement",
    },
    kind: "select",
    options: [
      {
        value: "fan",
        label: {
          id: "motionAtlas.provenance-peelback.controls.sourceArrangement.fan",
          message: "fan",
        },
      },
      {
        value: "parallel-sheets",
        label: {
          id: "motionAtlas.provenance-peelback.controls.sourceArrangement.parallel-sheets",
          message: "parallel-sheets",
        },
      },
    ],
  },
];
