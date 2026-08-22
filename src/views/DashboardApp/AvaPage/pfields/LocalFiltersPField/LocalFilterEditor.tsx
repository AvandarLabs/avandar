import { useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Group,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import css from "./LocalFiltersPField.module.css";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ReactNode } from "react";

type Props = {
  filter: LocalFilter;
  onChange: (filter: LocalFilter) => void;
  onRemove: () => void;
};

/** Edits one visualization-local filter definition. */
export function LocalFilterEditor({
  filter,
  onChange,
  onRemove,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const modeOptions = [
    { value: "select_single" as const, label: t`Single-select` },
    { value: "select_multi" as const, label: t`Multi-select` },
    { value: "contains" as const, label: t`Text contains` },
  ];
  const updateFilter = (changes: Partial<LocalFilter>): void => {
    onChange({ ...filter, ...changes } as LocalFilter);
  };
  return (
    <Box p="xs" className={css.localFilterEditorContainer}>
      <Stack gap={6}>
        <Group justify="space-between">
          <TextInput
            size="xs"
            placeholder={t`Label, e.g. Region`}
            value={filter.label}
            onChange={(event) => {
              updateFilter({ label: event.currentTarget.value });
            }}
            className={css.localFilterEditorLabel}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={onRemove}
            aria-label={t`Remove local filter`}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
        <TextInput
          size="xs"
          placeholder={t`Column name (must match SQL)`}
          value={filter.columnName}
          onChange={(event) => {
            updateFilter({ columnName: event.currentTarget.value });
          }}
        />
        <Select
          size="xs"
          allowDeselect={false}
          data={modeOptions}
          value={filter.mode}
          onChange={(mode) => {
            if (mode) {
              updateFilter({ mode: mode as LocalFilter["mode"] });
            }
          }}
        />
        {filter.mode !== "contains" ? (
          <TextInput
            size="xs"
            placeholder={t`Values, comma-separated`}
            value={filter.optionsRaw}
            onChange={(event) => {
              updateFilter({ optionsRaw: event.currentTarget.value });
            }}
          />
        ) : null}
        <TextInput
          size="xs"
          placeholder={
            filter.mode === "select_multi"
              ? t`Default values, comma-separated or JSON array`
              : t`Default value (optional)`
          }
          value={filter.defaultValue}
          onChange={(event) => {
            updateFilter({ defaultValue: event.currentTarget.value });
          }}
        />
      </Stack>
    </Box>
  );
}
