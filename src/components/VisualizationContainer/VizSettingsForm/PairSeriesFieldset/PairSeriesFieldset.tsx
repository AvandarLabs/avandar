import { makeSelectOptions, Select } from "@avandar/ui";
import { propPasses, removeAtIndex } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Card,
  ColorInput,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import css from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset/PairSeriesFieldset.module.css";
import { SeriesList } from "@/components/VisualizationContainer/VizSettingsForm/SeriesList/SeriesList";
import { useUniqueRowKeys } from "@/components/VisualizationContainer/VizSettingsForm/useUniqueRowKeys";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";

type Props = {
  fields: readonly QueryResultColumn[];
  series: readonly ScatterSeries[];
  onChange: (next: ScatterSeries[]) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
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
  layout = "stacked",
}: Props): JSX.Element {
  const { t } = useLingui();

  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
  }, [fields]);

  const numericOptions = useMemo(() => {
    return makeSelectOptions(numericFields, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [numericFields]);

  const addSeries = useCallback(() => {
    const xField = numericFields[0];
    if (xField === undefined) {
      return;
    }
    const yField = numericFields[1] ?? xField;
    const next: ScatterSeries = { xKey: xField.name, key: yField.name };
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
      onChange(removeAtIndex(series, idx));
    },
    [series, onChange],
  );

  const seriesIdentities = useMemo(() => {
    return series.map((s) => {
      return `${s.key}-${s.xKey}`;
    });
  }, [series]);
  const seriesRowKeys = useUniqueRowKeys(seriesIdentities);

  const seriesGroup = (
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
              className={css.helpCursor}
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

      <SeriesList layout={layout}>
        {series.map((scatterSeries, idx) => {
          return (
            <Card
              key={seriesRowKeys[idx]}
              withBorder
              shadow="none"
              padding="sm"
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Stack gap="xs" className={css.flexFillMinW0}>
                    <Select
                      allowDeselect={false}
                      label={t`X column`}
                      data={numericOptions}
                      value={scatterSeries.xKey}
                      disabled={numericOptions.length === 0}
                      placeholder={
                        numericOptions.length === 0
                          ? t`No numeric columns`
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
                      value={scatterSeries.key}
                      disabled={numericOptions.length === 0}
                      placeholder={
                        numericOptions.length === 0
                          ? t`No numeric columns`
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
                    value={scatterSeries.label ?? ""}
                    placeholder={t`Defaults to "Y vs X"`}
                    onChange={(event) => {
                      const labelText = event.currentTarget.value;
                      updateAt(idx, {
                        label: labelText === "" ? undefined : labelText,
                      });
                    }}
                    className={css.flexFill}
                  />
                  <ColorInput
                    label={t`Color`}
                    value={scatterSeries.color ?? ""}
                    swatches={[...CHART_COLOR_SWATCHES]}
                    withEyeDropper={false}
                    format="hex"
                    onChange={(next) => {
                      updateAt(idx, {
                        color: next === "" ? undefined : next,
                      });
                    }}
                    className={css.flexFill}
                  />
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SeriesList>
    </Stack>
  );

  return (
    <SettingsColumns
      layout={layout}
      groups={[{ id: "series", title: t`Series`, content: seriesGroup }]}
    />
  );
}
