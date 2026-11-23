import { omit } from "@avandar/utils";
import { useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
import type {
  ChatCaseBucketGrain,
  ChatCaseValuePickerRuleType,
  ChatCaseValueShape,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
} from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";

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
  /**
   * Sets the column that matches this dataset's rows to a case. When the
   * column is not yet a field, `columnName` is the name the new field starts
   * with. A missing name leaves the draft unchanged.
   */
  setPrimaryKeyColumnId: (
    datasetId: string,
    columnId: string,
    columnName?: string,
  ) => void;
  setLabelColumnId: (columnId: string) => void;
  removeSourceDataset: (datasetId: string) => void;
  /**
   * Swaps one contributing dataset for another and drops the columns that
   * came from the old one. The replacement has no join key until a column
   * is chosen. A dataset the draft already uses is left as it is.
   */
  replaceSourceDataset: (datasetId: string, nextDatasetId: string) => void;
  /**
   * Adds a dataset the draft can pull columns from. It has no join key until
   * a column is added or chosen. A dataset already listed is left as it is.
   */
  addSourceDataset: (datasetId: string) => void;
  /**
   * Maps one more column of a contributing dataset. The first column of a
   * dataset that has no join key becomes that key. A column already listed
   * is left as it is.
   */
  addSourceColumn: (
    column: Readonly<{
      datasetId: string;
      columnId: string;
      name: string;
    }>,
  ) => void;
  setAttributeName: (columnId: string, name: string) => void;
  setAttributeValuePicker: (
    columnId: string,
    valuePickerRuleType: ChatCaseValuePickerRuleType,
  ) => void;
  setAttributeValueShape: (
    columnId: string,
    valueShape: Exclude<ChatCaseValueShape, "bucketed_list">,
  ) => void;
  /**
   * Keeps one value per period for a column: sets its shape, its period,
   * and the date column that places each row in a period. A join key and
   * the label keep one value.
   */
  setAttributeBucket: (
    columnId: string,
    bucket: Readonly<{
      bucketGrain: ChatCaseBucketGrain;
      bucketColumnId: string | undefined;
    }>,
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
 * Forces a column into the mapped set as one value. A join key is what
 * matches its dataset's rows to a case, and the label names the case, so
 * neither can point at an excluded column or at one that keeps more than
 * one value.
 */
function _withKeyOrLabelColumn(
  draft: ChatProposedCaseType,
  columnId: string,
): ChatProposedCaseType {
  return _mapAttribute(draft, columnId, (attribute) => {
    return {
      ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
      isIncluded: true,
      valueShape: "single",
    };
  });
}

/** Whether a column is the draft's label or one of its join keys. */
function _isKeyOrLabelColumn(
  draft: ChatProposedCaseType,
  columnId: string,
): boolean {
  return (
    draft.labelColumnId === columnId ||
    draft.sourceDatasets.some((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId === columnId;
    })
  );
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
 * Whether an included per-period field still has no date column of its own
 * dataset, which the card shows on the row and refuses to create. A date
 * column the dataset does not offer counts as none: creation would drop the
 * field.
 */
/** A column the card maps onto a contributing dataset. */
type CaseTypeDraftSourceColumn = Readonly<{
  datasetId: string;
  columnId: string;
  name: string;
}>;

/** The column ids the draft already maps from one dataset. */
function _columnIdsForDataset(
  draft: ChatProposedCaseType,
  datasetId: string,
): ReadonlySet<string> {
  return new Set(
    draft.attributes.flatMap((attribute) => {
      return attribute.datasetId === datasetId ? [attribute.columnId] : [];
    }),
  );
}

/** Whether the draft already pulls columns from this dataset. */
function _hasSourceDataset(
  draft: ChatProposedCaseType,
  datasetId: string,
): boolean {
  return draft.sourceDatasets.some((sourceDataset) => {
    return sourceDataset.datasetId === datasetId;
  });
}

/**
 * Whether this source's join key is a column the draft maps from that same
 * dataset. A dataset the user just added has an empty key, which fails.
 */
function _hasJoinKey(
  draft: ChatProposedCaseType,
  sourceDataset: ChatProposedCaseType["sourceDatasets"][number],
): boolean {
  return draft.attributes.some((attribute) => {
    return (
      sourceDataset.primaryKeyColumnId.length > 0 &&
      attribute.datasetId === sourceDataset.datasetId &&
      attribute.columnId === sourceDataset.primaryKeyColumnId
    );
  });
}

/** Drops the label when its column is leaving the draft. */
function _withoutLabelFromColumns(
  draft: ChatProposedCaseType,
  columnIds: ReadonlySet<string>,
): ChatProposedCaseType {
  if (!draft.labelColumnId || !columnIds.has(draft.labelColumnId)) {
    return draft;
  }
  return { ...draft, labelColumnId: undefined };
}

/** A newly mapped column: included, one value, the default value rule. */
function _makeAddedColumn(
  column: CaseTypeDraftSourceColumn,
): ChatProposedCaseAttribute {
  return {
    datasetId: column.datasetId,
    columnId: column.columnId,
    name: column.name,
    isIncluded: true,
    valueShape: "single",
    valuePickerRuleType: "most_frequent",
  };
}

/** The draft plus one mapped column. */
function _withAddedColumn(
  draft: ChatProposedCaseType,
  column: CaseTypeDraftSourceColumn,
): ChatProposedCaseType {
  return {
    ...draft,
    attributes: [...draft.attributes, _makeAddedColumn(column)],
  };
}

/**
 * The draft without one contributing dataset, including its columns. The
 * label is cleared when it named a column from that dataset.
 */
function _withoutSourceDataset(
  draft: ChatProposedCaseType,
  datasetId: string,
): ChatProposedCaseType {
  const removedColumnIds = _columnIdsForDataset(draft, datasetId);
  const withoutLabel = _withoutLabelFromColumns(draft, removedColumnIds);
  return {
    ...withoutLabel,
    sourceDatasets: withoutLabel.sourceDatasets.filter((sourceDataset) => {
      return sourceDataset.datasetId !== datasetId;
    }),
    attributes: withoutLabel.attributes.filter((attribute) => {
      return attribute.datasetId !== datasetId;
    }),
  };
}

/**
 * The draft with one contributing dataset swapped for another. Columns from
 * the old dataset are dropped, and the replacement starts with no join key.
 */
function _withReplacedSourceDataset(
  draft: ChatProposedCaseType,
  datasetId: string,
  nextDatasetId: string,
): ChatProposedCaseType {
  if (
    datasetId === nextDatasetId ||
    !_hasSourceDataset(draft, datasetId) ||
    _hasSourceDataset(draft, nextDatasetId)
  ) {
    return draft;
  }
  const withoutOldDataset = _withoutSourceDataset(draft, datasetId);
  return {
    ...withoutOldDataset,
    sourceDatasets: draft.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId === datasetId
        ? { datasetId: nextDatasetId, primaryKeyColumnId: "" }
        : sourceDataset;
    }),
  };
}

/** The draft plus a contributing dataset that still needs a join key. */
function _withAddedSourceDataset(
  draft: ChatProposedCaseType,
  datasetId: string,
): ChatProposedCaseType {
  if (_hasSourceDataset(draft, datasetId)) {
    return draft;
  }
  return {
    ...draft,
    sourceDatasets: [
      ...draft.sourceDatasets,
      { datasetId, primaryKeyColumnId: "" },
    ],
  };
}

/**
 * The draft with one more column of a contributing dataset. When that
 * dataset has no join key, the new column becomes it.
 */
function _withSourceColumn(
  draft: ChatProposedCaseType,
  column: CaseTypeDraftSourceColumn,
): ChatProposedCaseType {
  if (
    !_hasSourceDataset(draft, column.datasetId) ||
    draft.attributes.some((attribute) => {
      return attribute.columnId === column.columnId;
    })
  ) {
    return draft;
  }
  const withColumn = _withAddedColumn(draft, column);
  const sourceDataset = draft.sourceDatasets.find((candidate) => {
    return candidate.datasetId === column.datasetId;
  });
  if (sourceDataset && _hasJoinKey(draft, sourceDataset)) {
    return withColumn;
  }
  return {
    ...withColumn,
    sourceDatasets: withColumn.sourceDatasets.map((candidate) => {
      return candidate.datasetId === column.datasetId
        ? { ...candidate, primaryKeyColumnId: column.columnId }
        : candidate;
    }),
  };
}

/**
 * The draft with this dataset's join key set to `columnId`. A column the
 * draft does not list yet is added when `columnName` is given.
 */
function _withPrimaryKeyColumn(
  draft: ChatProposedCaseType,
  datasetId: string,
  columnId: string,
  columnName: string | undefined,
): ChatProposedCaseType {
  if (!_hasSourceDataset(draft, datasetId)) {
    return draft;
  }
  const hasAttribute = draft.attributes.some((attribute) => {
    return attribute.columnId === columnId;
  });
  if (!hasAttribute && columnName === undefined) {
    return draft;
  }
  const withAttribute = hasAttribute
    ? draft
    : _withAddedColumn(draft, {
        datasetId,
        columnId,
        name: columnName ?? "",
      });
  const keyed = _withKeyOrLabelColumn(withAttribute, columnId);
  return {
    ...keyed,
    sourceDatasets: keyed.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId === datasetId
        ? { ...sourceDataset, primaryKeyColumnId: columnId }
        : sourceDataset;
    }),
  };
}

/** Whether any contributing dataset is missing a mapped join key. */
function _hasSourceWithoutJoinKey(draft: ChatProposedCaseType): boolean {
  return draft.sourceDatasets.some((sourceDataset) => {
    return !_hasJoinKey(draft, sourceDataset);
  });
}

function _hasPeriodWithoutDateColumn(
  options: Readonly<{
    draft: ChatProposedCaseType;
    dateColumnOptionsByDatasetId: Readonly<
      Record<string, readonly DateColumnOption[]>
    >;
  }>,
): boolean {
  return options.draft.attributes.some((attribute) => {
    if (!attribute.isIncluded || attribute.valueShape !== "bucketed_list") {
      return false;
    }
    const dateColumnOptions =
      options.dateColumnOptionsByDatasetId[attribute.datasetId] ?? [];
    return !dateColumnOptions.some((option) => {
      return option.value === attribute.bucketColumnId;
    });
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
 *
 * The status set is held beside the draft, with ids, because the status set
 * editor keys its rows by id. It is written back into `draft` by name, which
 * is how chat and the create path describe statuses.
 */
export function useCaseTypeDraftEditor(
  options: Readonly<{
    proposedDraft: ChatProposedCaseType;
    /**
     * Each source dataset's date and timestamp columns. A per-period field
     * may only group its rows by one of its own dataset's.
     */
    dateColumnOptionsByDatasetId: Readonly<
      Record<string, readonly DateColumnOption[]>
    >;
  }>,
): CaseTypeDraftEditor {
  const { proposedDraft } = options;
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
      !_hasSourceWithoutJoinKey(draft) &&
      !_hasReservedAttributeName(draft) &&
      !_hasPeriodWithoutDateColumn({
        draft,
        dateColumnOptionsByDatasetId: options.dateColumnOptionsByDatasetId,
      }) &&
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
    setPrimaryKeyColumnId: (datasetId, columnId, columnName) => {
      setDraft((current) => {
        return _withPrimaryKeyColumn(current, datasetId, columnId, columnName);
      });
    },
    removeSourceDataset: (datasetId) => {
      setDraft((current) => {
        // Dropping the source alone would leave its attributes pointing at a
        // dataset with no join key, which the relation builder rejects.
        return _withoutSourceDataset(current, datasetId);
      });
    },
    replaceSourceDataset: (datasetId, nextDatasetId) => {
      setDraft((current) => {
        return _withReplacedSourceDataset(current, datasetId, nextDatasetId);
      });
    },
    addSourceDataset: (datasetId) => {
      setDraft((current) => {
        return _withAddedSourceDataset(current, datasetId);
      });
    },
    addSourceColumn: (column) => {
      setDraft((current) => {
        return _withSourceColumn(current, column);
      });
    },
    setLabelColumnId: (columnId) => {
      setDraft((current) => {
        return {
          ..._withKeyOrLabelColumn(current, columnId),
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
    setAttributeValueShape: (columnId, valueShape) => {
      setDraft((current) => {
        // The card locks these columns. This keeps the draft right even if a
        // caller does not.
        if (valueShape !== "single" && _isKeyOrLabelColumn(current, columnId)) {
          return current;
        }
        return _mapAttribute(current, columnId, (attribute) => {
          return {
            ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
            valueShape,
          };
        });
      });
    },
    setAttributeBucket: (columnId, bucket) => {
      setDraft((current) => {
        if (_isKeyOrLabelColumn(current, columnId)) {
          return current;
        }
        return _mapAttribute(current, columnId, (attribute) => {
          return {
            ...attribute,
            valueShape: "bucketed_list",
            bucketGrain: bucket.bucketGrain,
            bucketColumnId: bucket.bucketColumnId,
          };
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
