import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Radio, Select, Stack, TextInput } from "@mantine/core";
import type {
  ApplyDictionariesAction,
  ValueResolution,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { AddedCodeConflict } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { UnmatchedRow } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/buildUnmatchedRows";
import type { Dispatch, ReactNode } from "react";

type Action = ValueResolution["action"];

type Props = {
  row: UnmatchedRow;
  resolution: ValueResolution | undefined;
  canEditDictionaries: boolean;
  /** Set when another value adds this value's code with another label. */
  conflict: AddedCodeConflict | undefined;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

const CONVERTED_ACTIONS: readonly Action[] = ["keep", "map", "add", "empty"];
const REFERENCE_ACTIONS: readonly Action[] = ["keep", "add"];

/** The radio labels, by action. Keep reads differently without conversion. */
function useActionLabels(isConverting: boolean): Record<Action, string> {
  const { t } = useLingui();
  return {
    keep: isConverting ? t`Keep as is` : t`Leave unlabeled`,
    map: t`Use an existing label`,
    add: t`Add to list`,
    empty: t`Leave empty`,
  };
}

/** Why each action is unavailable for this value, if it is. */
function useBlockers(
  row: UnmatchedRow,
  canEditDictionaries: boolean,
): Partial<Record<Action, string>> {
  const { t } = useLingui();
  const { value } = row.item;
  let addBlocker: string | undefined;
  if (!canEditDictionaries) {
    addBlocker = t`Adding a value changes the dictionary, so it needs edit access to dictionaries.`;
  } else if (row.isInListWithoutLabel) {
    addBlocker = t`${value} is already in the list, without a label. Label it on the dictionary.`;
  }
  const keepBlocker = row.cannotStayAsText
    ? t`This column becomes whole numbers, so this value can't stay as text.`
    : undefined;
  return { add: addBlocker, keep: keepBlocker };
}

/** The resolution an action starts with when it is chosen. */
function _startResolution(action: Action, row: UnmatchedRow): ValueResolution {
  switch (action) {
    case "map": {
      const firstLabelled = row.codeList.pairs.find((pair) => {
        return pair.label.trim() !== "";
      });
      return { action: "map", code: firstLabelled?.code ?? "" };
    }
    case "add":
      return { action: "add", text: "" };
    case "keep":
    case "empty":
      return { action };
  }
}

function ActionRadio(
  props: Readonly<{
    name: string;
    label: string;
    isChecked: boolean;
    blocker: string | undefined;
    onSelect: () => void;
  }>,
): ReactNode {
  const radio = (
    <Radio
      size="xs"
      name={props.name}
      label={props.label}
      checked={props.isChecked}
      disabled={props.blocker !== undefined}
      onChange={props.onSelect}
    />
  );
  return props.blocker ? (
    <Tooltip multiline maw={280} label={props.blocker}>
      <span>{radio}</span>
    </Tooltip>
  ) : (
    radio
  );
}

/**
 * The Select or input a chosen action needs: an existing label, or the text
 * to add.
 */
function ResolutionDetail(
  props: Readonly<{
    row: UnmatchedRow;
    resolution: ValueResolution | undefined;
    conflict: AddedCodeConflict | undefined;
    onResolve: (resolution: ValueResolution) => void;
  }>,
): ReactNode {
  const { t } = useLingui();
  const { row, resolution, conflict } = props;
  const { value } = row.item;
  if (resolution?.action === "map") {
    const options = row.codeList.pairs
      .filter((pair) => {
        return pair.label.trim() !== "";
      })
      .map((pair) => {
        return { value: pair.code, label: pair.label };
      });
    return (
      <Select
        size="xs"
        maw={280}
        aria-label={t`Label to use for ${value}`}
        data={options}
        value={resolution.code}
        allowDeselect={false}
        onChange={(code) => {
          props.onResolve({ action: "map", code: code ?? "" });
        }}
      />
    );
  }
  if (resolution?.action === "add") {
    const isLabel = row.pick.direction === "decode";
    const conflictCode = conflict?.code;
    return (
      <TextInput
        error={
          conflictCode === undefined
            ? undefined
            : t`The code ${conflictCode} is added twice to this list.`
        }
        size="xs"
        maw={280}
        aria-label={isLabel ? t`Label for ${value}` : t`Code for ${value}`}
        placeholder={isLabel ? t`Label` : t`Code`}
        value={resolution.text}
        onChange={(event) => {
          props.onResolve({ action: "add", text: event.currentTarget.value });
        }}
      />
    );
  }
  return null;
}

/**
 * How one unmatched value is resolved: a radio group named by the value,
 * and, for Use an existing label or Add to list, the Select or input that
 * completes it. Nothing chosen means the default: Keep as is, or Leave
 * empty for a value a whole-number column cannot keep.
 */
export function ResolutionControl(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { row, dispatch } = props;
  const { value, valueKey } = row.item;
  const columnName = row.column.name;
  const isConverting = row.pick.mode === "convert";
  const labels = useActionLabels(isConverting);
  const blockers = useBlockers(row, props.canEditDictionaries);
  // What the conversion does with no resolution stored: keep the value, or
  // empty it when a whole-number column cannot keep it.
  const current =
    props.resolution?.action ?? (row.cannotStayAsText ? "empty" : "keep");
  const resolve = (resolution: ValueResolution): void => {
    dispatch({
      type: "resolve_value",
      columnId: row.column.id,
      valueKey,
      resolution,
    });
  };
  return (
    <Stack gap={6}>
      <div
        role="radiogroup"
        aria-label={t`What to do with ${value} in ${columnName}`}
      >
        <Group gap="md">
          {(isConverting ? CONVERTED_ACTIONS : REFERENCE_ACTIONS).map(
            (action) => {
              return (
                <ActionRadio
                  key={action}
                  name={`resolve-${row.column.id}-${valueKey}`}
                  label={labels[action]}
                  isChecked={current === action}
                  blocker={blockers[action]}
                  onSelect={() => {
                    resolve(_startResolution(action, row));
                  }}
                />
              );
            },
          )}
        </Group>
      </div>
      <ResolutionDetail
        row={row}
        resolution={props.resolution}
        conflict={props.conflict}
        onResolve={resolve}
      />
    </Stack>
  );
}
