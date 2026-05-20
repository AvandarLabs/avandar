import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Card,
  ColorInput,
  Divider,
  Group,
  Stack,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { makeSelectOptions, Select } from "@ui";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useCallback, useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  series: readonly BubbleSeries[];
  onChange: (next: BubbleSeries[]) => void;
};

/**
 * Fieldset for managing a list of bubble series. Each row has X, Y, and Size
 * column pickers, an optional label input, a color swatch, and a remove button.
 * An "Add series" button appends a new entry seeded from the first three unused
 * numeric columns.
 */
export function BubbleSeriesFieldset({
  fields,
  series,
  onChange,
}: Props): JSX.Element {
  const { t } = useLingui();

  const numericFields = useMemo(() => {
    return fields.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
  }, [fields]);

  const numericOptions = useMemo(() => {
    return makeSelectOptions(numericFields, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [numericFields]);

  const addSeries = useCallback(() => {
    const n0 = numericFields[0];
    const n1 = numericFields[1] ?? n0;
    const n2 = numericFields[2] ?? n1;
    if (n0 === undefined) {
      return;
    }
    const next: BubbleSeries = {
      xKey: n0.name,
      key: n1!.name,
      sizeKey: n2!.name,
    };
    onChange([...series, next]);
  }, [numericFields, series, onChange]);

  const updateAt = useCallback(
    (idx: number, patch: Partial<BubbleSeries>) => {
      const next = series.map((s, i) => {
        return i === idx ? { ...s, ...patch } : s;
      });
      onChange(next);
    },
    [series, onChange],
  );

  const removeAt = useCallback(
    (idx: number) => {
      onChange(
        series.filter((_, i) => {
          return i !== idx;
        }),
      );
    },
    [series, onChange],
  );

  return (
    <Stack gap="md">
      <Divider />

      <Group justify="space-between">
        <Group gap={6} align="center">
          <Title order={5}>
            <Trans>Series</Trans>
          </Title>
          <Tooltip
            multiline
            w={280}
            label={t`Each series is one cloud of bubbles. The size column determines bubble radius.`}
          >
            <IconInfoCircle
              size={14}
              aria-label={t`What is a series?`}
              style={{ cursor: "help" }}
            />
          </Tooltip>
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={addSeries}
          disabled={numericFields.length === 0}
        >
          <Trans>Add series</Trans>
        </Button>
      </Group>

      <Stack gap="sm">
        {series.map((s, idx) => {
          return (
            <Card
              key={`${s.key}-${s.xKey}-${s.sizeKey}-${idx}`}
              withBorder
              shadow="none"
              padding="sm"
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Group
                    gap="xs"
                    style={{ flex: 1, minWidth: 0 }}
                    wrap="nowrap"
                  >
                    <Select
                      allowDeselect={false}
                      label={t`X column`}
                      data={numericOptions}
                      value={s.xKey}
                      disabled={numericOptions.length === 0}
                      placeholder={
                        numericOptions.length === 0 ?
                          t`No numeric columns`
                        : t`Select a column`
                      }
                      onChange={(next) => {
                        if (next !== null) {
                          updateAt(idx, { xKey: next });
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <Select
                      allowDeselect={false}
                      label={t`Y column`}
                      data={numericOptions}
                      value={s.key}
                      disabled={numericOptions.length === 0}
                      placeholder={
                        numericOptions.length === 0 ?
                          t`No numeric columns`
                        : t`Select a column`
                      }
                      onChange={(next) => {
                        if (next !== null) {
                          updateAt(idx, { key: next });
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <Select
                      allowDeselect={false}
                      label={t`Size column`}
                      data={numericOptions}
                      value={s.sizeKey}
                      disabled={numericOptions.length === 0}
                      placeholder={
                        numericOptions.length === 0 ?
                          t`No numeric columns`
                        : t`Select a column`
                      }
                      onChange={(next) => {
                        if (next !== null) {
                          updateAt(idx, { sizeKey: next });
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  </Group>
                  <ActionIcon
                    aria-label={t`Remove series`}
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      removeAt(idx);
                    }}
                    mt="lg"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                <Group gap="xs">
                  <TextInput
                    label={t`Series label`}
                    value={s.label ?? ""}
                    placeholder={t`Defaults to "Y vs X"`}
                    onChange={(event) => {
                      const val = event.currentTarget.value;
                      updateAt(idx, { label: val === "" ? undefined : val });
                    }}
                    style={{ flex: 1 }}
                  />
                  <ColorInput
                    label={t`Color`}
                    value={s.color ?? ""}
                    swatches={[...CHART_COLOR_SWATCHES]}
                    withEyeDropper={false}
                    format="hex"
                    onChange={(next) => {
                      updateAt(idx, { color: next === "" ? undefined : next });
                    }}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
