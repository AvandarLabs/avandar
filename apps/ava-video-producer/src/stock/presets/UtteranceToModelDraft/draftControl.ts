import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive entity, relationship and attribute editors. */
export const DRAFT_CONTROL: StockControl = {
  path: "draft",
  label: {
    id: "motionAtlas.utterance-to-model-draft.controls.draft",
    message: "Draft",
  },
  kind: "object",
  controls: [
    {
      path: "entities",
      label: {
        id: "motionAtlas.utterance-to-model-draft.controls.draft.entities",
        message: "Entities",
      },
      kind: "collection",
      minItems: 2,
      maxItems: 2,
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
          partId: {
            type: "string",
          },
        },
        required: ["id", "label", "partId"],
        additionalProperties: false,
      },
      itemControls: [
        {
          path: "id",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.entities.id",
            message: "Id",
          },
          kind: "text",
          minLength: 1,
          maxLength: 20,
        },
        {
          path: "label",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.entities.label",
            message: "Label",
          },
          kind: "text",
          minLength: 1,
          maxLength: 24,
        },
        {
          path: "partId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.entities.partId",
            message: "Part id",
          },
          kind: "select",
          optionsFrom: {
            path: "sentenceParts",
            valueKey: "id",
            labelKey: "text",
          },
        },
      ],
    },
    {
      path: "relationships",
      label: {
        id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships",
        message: "Relationships",
      },
      kind: "collection",
      minItems: 1,
      maxItems: 1,
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
          partId: {
            type: "string",
          },
          fromEntityId: {
            type: "string",
          },
          toEntityId: {
            type: "string",
          },
        },
        required: ["id", "label", "partId", "fromEntityId", "toEntityId"],
        additionalProperties: false,
      },
      itemControls: [
        {
          path: "id",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships.id",
            message: "Id",
          },
          kind: "text",
          minLength: 1,
          maxLength: 20,
        },
        {
          path: "label",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships.label",
            message: "Label",
          },
          kind: "text",
          minLength: 1,
          maxLength: 24,
        },
        {
          path: "partId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships.partId",
            message: "Part id",
          },
          kind: "select",
          optionsFrom: {
            path: "sentenceParts",
            valueKey: "id",
            labelKey: "text",
          },
        },
        {
          path: "fromEntityId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships.fromEntityId",
            message: "From entity id",
          },
          kind: "select",
          optionsFrom: {
            path: "draft.entities",
            valueKey: "id",
            labelKey: "label",
          },
        },
        {
          path: "toEntityId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.relationships.toEntityId",
            message: "To entity id",
          },
          kind: "select",
          optionsFrom: {
            path: "draft.entities",
            valueKey: "id",
            labelKey: "label",
          },
        },
      ],
    },
    {
      path: "attributes",
      label: {
        id: "motionAtlas.utterance-to-model-draft.controls.draft.attributes",
        message: "Attributes",
      },
      kind: "collection",
      minItems: 0,
      maxItems: 1,
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
          partId: {
            type: "string",
          },
          entityId: {
            type: "string",
          },
        },
        required: ["id", "label", "partId", "entityId"],
        additionalProperties: false,
      },
      itemControls: [
        {
          path: "id",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.attributes.id",
            message: "Id",
          },
          kind: "text",
          minLength: 1,
          maxLength: 20,
        },
        {
          path: "label",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.attributes.label",
            message: "Label",
          },
          kind: "text",
          minLength: 1,
          maxLength: 24,
        },
        {
          path: "partId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.attributes.partId",
            message: "Part id",
          },
          kind: "select",
          optionsFrom: {
            path: "sentenceParts",
            valueKey: "id",
            labelKey: "text",
          },
        },
        {
          path: "entityId",
          label: {
            id: "motionAtlas.utterance-to-model-draft.controls.draft.attributes.entityId",
            message: "Entity id",
          },
          kind: "select",
          optionsFrom: {
            path: "draft.entities",
            valueKey: "id",
            labelKey: "label",
          },
        },
      ],
    },
  ],
};
