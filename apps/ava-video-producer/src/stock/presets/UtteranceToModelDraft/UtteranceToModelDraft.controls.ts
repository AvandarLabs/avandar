import { DRAFT_CONTROL } from "./draftControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors for every supplied field. */
export const controls: StockControl[] = [
  {
    path: "sentenceParts",
    label: {
      id: "motionAtlas.utterance-to-model-draft.controls.sentenceParts",
      message: "Sentence parts",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 7,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        text: {
          type: "string",
          minLength: 1,
          maxLength: 28,
        },
      },
      required: ["id", "text"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.sentenceParts.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "text",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.sentenceParts.text",
          message: "Text",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  DRAFT_CONTROL,
  {
    path: "review",
    label: {
      id: "motionAtlas.utterance-to-model-draft.controls.review",
      message: "Review",
    },
    kind: "object",
    controls: [
      {
        path: "outcome",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.review.outcome",
          message: "Outcome",
        },
        kind: "select",
        options: [
          {
            value: "accept",
            label: {
              id: "motionAtlas.utterance-to-model-draft.controls.review.outcome.accept",
              message: "accept",
            },
          },
          {
            value: "pending",
            label: {
              id: "motionAtlas.utterance-to-model-draft.controls.review.outcome.pending",
              message: "pending",
            },
          },
        ],
      },
      {
        path: "reviewerLabel",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.review.reviewerLabel",
          message: "Reviewer label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "note",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.review.note",
          message: "Note",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.utterance-to-model-draft.controls.copy",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "source",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.source",
          message: "Source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "draft",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.draft",
          message: "Draft",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "entity",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.entity",
          message: "Entity",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "relationship",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.relationship",
          message: "Relationship",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "attribute",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.attribute",
          message: "Attribute",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "accepted",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.accepted",
          message: "Accepted",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "pending",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.pending",
          message: "Pending",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.copy.example",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
    ],
  },
  {
    path: "showSourceGuides",
    label: {
      id: "motionAtlas.utterance-to-model-draft.controls.showSourceGuides",
      message: "Show source guides",
    },
    kind: "boolean",
  },
  {
    path: "modelLayout",
    label: {
      id: "motionAtlas.utterance-to-model-draft.controls.modelLayout",
      message: "Model layout",
    },
    kind: "select",
    options: [
      {
        value: "horizontal",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.modelLayout.horizontal",
          message: "horizontal",
        },
      },
      {
        value: "stacked",
        label: {
          id: "motionAtlas.utterance-to-model-draft.controls.modelLayout.stacked",
          message: "stacked",
        },
      },
    ],
  },
];
