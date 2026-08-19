import type {
  ChatCaseSourceDataset,
  ChatCreatedCaseAttribute,
  ChatCreatedCaseType,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
} from "$/types/chat.types";

function _toDatasetColumnAttribute(options: {
  attribute: ChatProposedCaseAttribute;
  isLabel: boolean;
}): ChatCreatedCaseAttribute {
  const { attribute, isLabel } = options;
  return {
    name: attribute.name,
    kind: "dataset_column",
    datasetId: attribute.datasetId,
    columnId: attribute.columnId,
    valuePickerRuleType: attribute.valuePickerRuleType,
    ...(attribute.description ? { description: attribute.description } : {}),
    ...(isLabel ? { isLabel: true } : {}),
  };
}

/**
 * A join key has to stay mapped even if the user unchecked it in the card: its
 * dataset's rows cannot be matched to a case without it. Anything else the user
 * excluded stays excluded.
 */
function _includedAttributes(
  draft: ChatProposedCaseType,
): ChatProposedCaseAttribute[] {
  const primaryKeyColumnIds = new Set(
    draft.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId;
    }),
  );
  return draft.attributes.filter((attribute) => {
    return attribute.isIncluded || primaryKeyColumnIds.has(attribute.columnId);
  });
}

/**
 * Drops sources that no longer contribute anything.
 *
 * A dataset whose every attribute the user unchecked would otherwise still be
 * declared as a source, adding a join key column for data nothing reads.
 */
function _contributingSourceDatasets(options: {
  draft: ChatProposedCaseType;
  included: readonly ChatProposedCaseAttribute[];
}): ChatCaseSourceDataset[] {
  const contributingDatasetIds = new Set(
    options.included.map((attribute) => {
      return attribute.datasetId;
    }),
  );
  return options.draft.sourceDatasets.filter((sourceDataset) => {
    return contributingDatasetIds.has(sourceDataset.datasetId);
  });
}

/**
 * Picks the column that labels each case: the user's choice when it survived
 * their edits, otherwise the first remaining join key, matching how the concept
 * creator form falls back when no label is set.
 */
function _resolveLabelColumnId(options: {
  draft: ChatProposedCaseType;
  included: readonly ChatProposedCaseAttribute[];
  sourceDatasets: readonly ChatCaseSourceDataset[];
}): string | undefined {
  const { draft, included, sourceDatasets } = options;
  const isLabelIncluded = included.some((attribute) => {
    return attribute.columnId === draft.labelColumnId;
  });
  return isLabelIncluded && draft.labelColumnId ?
      draft.labelColumnId
    : sourceDatasets[0]?.primaryKeyColumnId;
}

/**
 * Converts a draft the user reviewed in the chat card into the payload
 * `applyCreatedCaseTypes` persists. Only attributes still checked in the card
 * are kept, the card's per-column value pickers are carried through, and every
 * dataset still contributing keeps its join key.
 */
export function proposedCaseTypeToCreatedCaseType(
  draft: ChatProposedCaseType,
): ChatCreatedCaseType {
  const included = _includedAttributes(draft);
  const sourceDatasets = _contributingSourceDatasets({ draft, included });
  const labelColumnId = _resolveLabelColumnId({
    draft,
    included,
    sourceDatasets,
  });
  const datasetAttributes = included.map((attribute) => {
    return _toDatasetColumnAttribute({
      attribute,
      isLabel: attribute.columnId === labelColumnId,
    });
  });
  const manualAttributes = draft.manualEntryAttributes
    .filter((attribute) => {
      return attribute.isIncluded;
    })
    .map((attribute): ChatCreatedCaseAttribute => {
      const { description } = attribute;
      return {
        name: attribute.name,
        kind: "manual_entry",
        ...(description ? { description } : {}),
      };
    });

  return {
    name: draft.name,
    allowManualCreation: draft.allowManualCreation,
    identities: sourceDatasets,
    attributes: [...datasetAttributes, ...manualAttributes],
    ...(draft.description ? { description: draft.description } : {}),
  };
}
