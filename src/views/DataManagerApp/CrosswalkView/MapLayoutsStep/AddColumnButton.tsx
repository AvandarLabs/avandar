import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Popover, Stack, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { uuid } from "$/lib/uuid";
import { ColumnTypeSelect } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/ColumnTypeSelect";
import { getColumnNameProblem } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/getColumnNameProblem/getColumnNameProblem";
import { useColumnNameError } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useColumnNameError";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkAction } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { Dispatch, ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  dispatch: Dispatch<CrosswalkAction>;
};

function AddColumnForm(
  props: Readonly<{
    draft: CrosswalkDraft.T;
    onAdd: (name: string, dataType: AvaDataType.T) => void;
  }>,
): ReactNode {
  const { t } = useLingui();
  const toError = useColumnNameError();
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<AvaDataType.T>("varchar");
  const [hasTriedToAdd, setHasTriedToAdd] = useState(false);
  const problem = getColumnNameProblem({ name, draft: props.draft });
  const isShowingProblem = hasTriedToAdd || name.trim() !== "";
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setHasTriedToAdd(true);
        if (problem === undefined) {
          props.onAdd(name.trim(), dataType);
        }
      }}
    >
      <Stack gap="sm" w={260}>
        <TextInput
          size="xs"
          label={t`Column name`}
          data-autofocus
          value={name}
          error={isShowingProblem ? toError(problem, name) : undefined}
          onChange={(event) => {
            setName(event.currentTarget.value);
          }}
        />
        <ColumnTypeSelect value={dataType} onChange={setDataType} />
        <Group justify="flex-end">
          <Button type="submit" size="xs">
            <Trans>Add column</Trans>
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/**
 * Add a column to the combined dataset: a small form for its name and
 * type. A name another column has, ignoring case, or the source column's
 * name while it is added, is refused with the reason. The new column has
 * no fill in any layout until the user gives it one.
 */
export function AddColumnButton({
  draft,
  dispatch,
}: Readonly<Props>): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover
      opened={isOpen}
      onChange={setIsOpen}
      position="bottom-start"
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={() => {
            setIsOpen((wasOpen) => {
              return !wasOpen;
            });
          }}
        >
          <Trans>Add a column to the combined dataset</Trans>
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <AddColumnForm
          draft={draft}
          onAdd={(name, dataType) => {
            dispatch({
              type: "column_added",
              columnId: uuid<CrosswalkColumn.Id>(),
              name,
              dataType,
            });
            setIsOpen(false);
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
