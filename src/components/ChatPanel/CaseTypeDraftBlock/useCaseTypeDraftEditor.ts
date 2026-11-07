import { useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
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
  /** The draft as edited, with the card's status set written back into it. */
  draft: ChatProposedCaseType;
  /** The statuses the case type starts with, as the card edits them. */
  statusSet: ConceptStatus.SetValue;
  setStatusSet: (statusSet: ConceptStatus.SetValue) => void;
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
 * The draft with the card's status set written back into it, so the draft the
 * card creates carries the statuses the user sees.
 */
function _withStatusSet(
  draft: ChatProposedCaseType,
  statusSet: ConceptStatus.SetValue,
): ChatProposedCaseType {
  const defaultStatus = statusSet.statuses.find((status) => {
    return status.id === statusSet.defaultStatusId;
  });
  return {
    ...draft,
    statuses: statusSet.statuses.map((status) => {
      return {
        name: status.name.trim(),
        description: status.description.trim(),
        color: status.color,
      };
    }),
    defaultStatusName: defaultStatus?.name.trim(),
  };
}

/**
 * Whether an attribute the card would create is named like the built-in
 * status, which every case type already has and which the database refuses
 * as an attribute name.
 */
function _hasReservedAttributeName(draft: ChatProposedCaseType): boolean {
  return [...draft.attributes, ...draft.manualEntryAttributes].some(
    (attribute) => {
      return (
        attribute.isIncluded &&
        ConceptStatus.isReservedAttributeName(attribute.name)
      );
    },
  );
}

/**
 * Holds the user's edits to a proposed case type draft. Re-initializes when the
 * model proposes a revised draft, so a fresh proposal replaces stale local
 * edits rather than silently merging with them.
 *
 * The reset keys off the proposal's contents rather than its identity: callers
 * that rebuild an equivalent object on each render must not wipe out the edits
 * in progress.
 *
 * The status set is held beside the draft, with ids, because the status set
 * editor keys its rows by id. It is written back into `draft` by name, which
 * is how chat and the create path describe statuses.
 */
export function useCaseTypeDraftEditor(
  proposedDraft: ChatProposedCaseType,
): CaseTypeDraftEditor {
  const proposalKey = JSON.stringify(proposedDraft);
  const [draft, setDraft] = useState(proposedDraft);
  const [statusSet, setStatusSet] = useState<ConceptStatus.SetValue>(() => {
    return makeStatusSetValueFromChatStatuses(proposedDraft);
  });
  const [appliedProposalKey, setAppliedProposalKey] = useState(proposalKey);
  if (appliedProposalKey !== proposalKey) {
    setAppliedProposalKey(proposalKey);
    setDraft(proposedDraft);
    setStatusSet(makeStatusSetValueFromChatStatuses(proposedDraft));
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
    draft: _withStatusSet(draft, statusSet),
    sourceGroups,
    statusSet,
    setStatusSet,
    canCreate:
      draft.name.trim().length > 0 &&
      draft.sourceDatasets.length > 0 &&
      !_hasReservedAttributeName(draft) &&
      ConceptStatus.findSetIssues({ value: statusSet }).length === 0,
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
            return sourceDataset.datasetId === datasetId
              ? { ...sourceDataset, primaryKeyColumnId: columnId }
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
              return attribute.name === name
                ? { ...attribute, isIncluded: !attribute.isIncluded }
                : attribute;
            },
          ),
        };
      });
    },
    addManualEntryAttribute: (name) => {
      const trimmedName = name.trim();
      // Every case type has a built-in status, so a field by that name would
      // collide with it and fail to save.
      if (
        trimmedName.length === 0 ||
        ConceptStatus.isReservedAttributeName(trimmedName)
      ) {
        return;
      }
      setDraft((current) => {
        const isDuplicate = current.manualEntryAttributes.some((attribute) => {
          return attribute.name === trimmedName;
        });
        return isDuplicate
          ? current
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
