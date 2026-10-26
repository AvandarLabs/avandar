import { makeObjectFromEntries, objectEntries, prop } from "@avandar/utils";
import { arrayMove } from "@dnd-kit/helpers";
import { uuid } from "$/lib/uuid";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type {
  StatusReplacements,
  StatusSetEditorActions,
} from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";

type Options = {
  value: ConceptStatus.SetValue;
  onChange: (value: ConceptStatus.SetValue) => void;
  replacements: StatusReplacements;
  onReplacementsChange: (replacements: StatusReplacements) => void;
};

function _hasDefault(value: ConceptStatus.SetValue): boolean {
  return value.statuses.some((status) => {
    return status.id === value.defaultStatusId;
  });
}

function _addStatus(value: ConceptStatus.SetValue): ConceptStatus.SetValue {
  const newStatusId: ConceptStatus.Id = uuid();
  const newStatus: ConceptStatus.Draft = {
    id: newStatusId,
    name: "",
    description: "",
    color: ConceptStatus.getNextFreeColor(value.statuses.map(prop("color"))),
  };
  return {
    statuses: [...value.statuses, newStatus],
    // A set with no usable default gets one as soon as it has a status.
    defaultStatusId: _hasDefault(value) ? value.defaultStatusId : newStatusId,
  };
}

function _removeStatus(options: {
  value: ConceptStatus.SetValue;
  statusId: ConceptStatus.Id;
}): ConceptStatus.SetValue {
  const { value, statusId } = options;
  const statuses = value.statuses.filter((status) => {
    return status.id !== statusId;
  });
  const keepsDefault = value.defaultStatusId !== statusId && _hasDefault(value);
  return {
    statuses,
    defaultStatusId: keepsDefault ? value.defaultStatusId : statuses[0]?.id,
  };
}

function _moveStatus(options: {
  value: ConceptStatus.SetValue;
  statusId: ConceptStatus.Id;
  offset: -1 | 1;
}): ConceptStatus.SetValue {
  const { value, statusId, offset } = options;
  const fromIndex = value.statuses.findIndex((status) => {
    return status.id === statusId;
  });
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= value.statuses.length) {
    return value;
  }
  return {
    ...value,
    statuses: arrayMove([...value.statuses], fromIndex, toIndex),
  };
}

function _withoutReplacementsTo(options: {
  replacements: StatusReplacements;
  statusId: ConceptStatus.Id;
}): StatusReplacements {
  return makeObjectFromEntries(
    objectEntries(options.replacements).filter(([, replacementId]) => {
      return replacementId !== options.statusId;
    }),
  );
}

/**
 * The edits the status set editor makes, each one reported as a whole new
 * set value. Removing a status also forgets any replacement that pointed at
 * it, so a removed status's records never move to another removed status.
 *
 * @returns One callback per edit, bound to the current value.
 */
export function makeStatusSetEditorActions(
  options: Readonly<Options>,
): StatusSetEditorActions {
  const { value, onChange, replacements, onReplacementsChange } = options;
  return {
    addStatus: () => {
      onChange(_addStatus(value));
    },
    updateStatus: (updatedStatus) => {
      const statuses = value.statuses.map((status) => {
        return status.id === updatedStatus.id ? updatedStatus : status;
      });
      onChange({ ...value, statuses });
    },
    removeStatus: (statusId) => {
      onChange(_removeStatus({ value, statusId }));
      onReplacementsChange(_withoutReplacementsTo({ replacements, statusId }));
    },
    makeDefault: (statusId) => {
      onChange({ ...value, defaultStatusId: statusId });
    },
    moveStatus: ({ statusId, offset }) => {
      onChange(_moveStatus({ value, statusId, offset }));
    },
    reorderStatuses: (statuses) => {
      onChange({ ...value, statuses });
    },
  };
}
