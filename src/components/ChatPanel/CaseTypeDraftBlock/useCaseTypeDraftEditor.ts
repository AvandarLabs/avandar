import { useState } from "react";
import type {
  ChatCaseValuePickerRuleType,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
} from "$/types/chat.types";

/** One contributing dataset's attributes, for rendering the card per source. */
export type CaseTypeDraftSourceGroup = {
  datasetId: string;
  primaryKeyColumnId: string;
  attributes: ChatProposedCaseAttribute[];
};

export type CaseTypeDraftEditor = {
  draft: ChatProposedCaseType;
  canCreate: boolean;
  /** The draft's attributes grouped by the dataset each one reads. */
  sourceGroups: CaseTypeDraftSourceGroup[];
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setAllowManualCreation: (allowManualCreation: boolean) => void;
  setPrimaryKeyColumnId: (datasetId: string, columnId: string) => void;
  setLabelColumnId: (columnId: string) => void;
  removeSourceDataset: (datasetId: string) => void;
  setAttributeName: (columnId: string, name: string) => void;
  setAttributeValuePicker: (
    columnId: string,
    valuePickerRuleType: ChatCaseValuePickerRuleType,
  ) => void;
  toggleAttribute: (columnId: string) => void;
  toggleManualEntryAttribute: (name: string) => void;
  addManualEntryAttribute: (name: string) => void;
};

function _mapAttribute(
  draft: ChatProposedCaseType,
  columnId: string,
  update: (attribute: ChatProposedCaseAttribute) => ChatProposedCaseAttribute,
): ChatProposedCaseType {
  return {
    ...draft,
    attributes: draft.attributes.map((attribute) => {
      return attribute.columnId === columnId ? update(attribute) : attribute;
    }),
  };
}

/**
 * Forces a column into the mapped set. A join key is what matches its dataset's
 * rows to a case, and the label names the case, so neither can point at an
 * excluded column.
 */
function _withIncludedColumn(
  draft: ChatProposedCaseType,
  columnId: string,
): ChatProposedCaseType {
  return _mapAttribute(draft, columnId, (attribute) => {
    return { ...attribute, isIncluded: true };
  });
}

/**
 * Holds the user's edits to a proposed case type draft. Re-initializes when the
 * model proposes a revised draft, so a fresh proposal replaces stale local
 * edits rather than silently merging with them.
 *
 * The reset keys off the proposal's contents rather than its identity: callers
 * that rebuild an equivalent object on each render must not wipe out the edits
 * in progress.
 */
export function useCaseTypeDraftEditor(
  proposedDraft: ChatProposedCaseType,
): CaseTypeDraftEditor {
  const proposalKey = JSON.stringify(proposedDraft);
  const [draft, setDraft] = useState(proposedDraft);
  const [appliedProposalKey, setAppliedProposalKey] = useState(proposalKey);
  if (appliedProposalKey !== proposalKey) {
    setAppliedProposalKey(proposalKey);
    setDraft(proposedDraft);
  }

  const sourceGroups = draft.sourceDatasets.map((sourceDataset) => {
    return {
      ...sourceDataset,
      attributes: draft.attributes.filter((attribute) => {
        return attribute.datasetId === sourceDataset.datasetId;
      }),
    };
  });

  return {
    draft,
    sourceGroups,
    canCreate: draft.name.trim().length > 0 && draft.sourceDatasets.length > 0,
    setName: (name) => {
      setDraft((current) => {
        return { ...current, name };
      });
    },
    setDescription: (description) => {
      setDraft((current) => {
        return { ...current, description };
      });
    },
    setAllowManualCreation: (allowManualCreation) => {
      setDraft((current) => {
        return { ...current, allowManualCreation };
      });
    },
    setPrimaryKeyColumnId: (datasetId, columnId) => {
      setDraft((current) => {
        return {
          ..._withIncludedColumn(current, columnId),
          sourceDatasets: current.sourceDatasets.map((sourceDataset) => {
            return sourceDataset.datasetId === datasetId ?
                { ...sourceDataset, primaryKeyColumnId: columnId }
              : sourceDataset;
          }),
        };
      });
    },
    removeSourceDataset: (datasetId) => {
      setDraft((current) => {
        // Dropping the source alone would leave its attributes pointing at a
        // dataset with no join key, which the relation builder rejects.
        return {
          ...current,
          sourceDatasets: current.sourceDatasets.filter((sourceDataset) => {
            return sourceDataset.datasetId !== datasetId;
          }),
          attributes: current.attributes.filter((attribute) => {
            return attribute.datasetId !== datasetId;
          }),
        };
      });
    },
    setLabelColumnId: (columnId) => {
      setDraft((current) => {
        return {
          ..._withIncludedColumn(current, columnId),
          labelColumnId: columnId,
        };
      });
    },
    setAttributeName: (columnId, name) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          return { ...attribute, name };
        });
      });
    },
    setAttributeValuePicker: (columnId, valuePickerRuleType) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          return { ...attribute, valuePickerRuleType };
        });
      });
    },
    toggleAttribute: (columnId) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          return { ...attribute, isIncluded: !attribute.isIncluded };
        });
      });
    },
    toggleManualEntryAttribute: (name) => {
      setDraft((current) => {
        return {
          ...current,
          manualEntryAttributes: current.manualEntryAttributes.map(
            (attribute) => {
              return attribute.name === name ?
                  { ...attribute, isIncluded: !attribute.isIncluded }
                : attribute;
            },
          ),
        };
      });
    },
    addManualEntryAttribute: (name) => {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return;
      }
      setDraft((current) => {
        const isDuplicate = current.manualEntryAttributes.some((attribute) => {
          return attribute.name === trimmedName;
        });
        return isDuplicate ? current
          : {
              ...current,
              manualEntryAttributes: [
                ...current.manualEntryAttributes,
                { name: trimmedName, isIncluded: true },
              ],
            };
      });
    },
  };
}
