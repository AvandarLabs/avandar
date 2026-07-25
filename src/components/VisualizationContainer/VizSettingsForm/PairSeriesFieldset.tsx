import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Card,
  ColorInput,
  Fieldset,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { makeSelectOptions, Select } from "@ui";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useCallback, useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  series: readonly ScatterSeries[];
  onChange: (next: ScatterSeries[]) => void;
};

/**
 * Fieldset for managing a list of scatter series. Each row has an X column
 * picker, a Y column picker, an optional label input, a color swatch, and a
 * remove button. An "Add series" button appends a new entry seeded from the
 * first two unused numeric columns.
 */
export function PairSeriesFieldset({
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
    const first = numericFields[0];
    const second = numericFields[1] ?? first;
    if (first === undefined) {
      return;
    }
    const next: ScatterSeries = { xKey: first.name, key: second!.name };
    onChange([...series, next]);
  }, [numericFields, series, onChange]);

  const updateAt = useCallback(
    (idx: number, patch: Partial<ScatterSeries>) => {
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
    <Fieldset legend={t`Series`}>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap={6} align="center">
            <Tooltip
              multiline
              w={280}
              label={t`Each series is one (X, Y) cloud of points. Add more to compare multiple metric pairs on the same chart.`}
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
                key={`${s.key}-${s.xKey}-${idx}`}
                withBorder
                shadow="none"
                padding="sm"
              >
                <Stack gap="xs">
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
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
                      />
                    </Stack>
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
                        updateAt(idx, {
                          color: next === "" ? undefined : next,
                        });
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
    </Fieldset>
  );
}
