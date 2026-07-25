import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Fieldset,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { makeBucketMap, propPasses, removeAtIndex } from "@utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { pathGet, pathSet } from "$/models/vizs/SettingDescriptor";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { useCallback, useMemo } from "react";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.module.css";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";
import type {
  RadarSeries,
  RenderAs,
  XYSeries,
} from "$/models/vizs/SeriesConfig";
import type { ErasedSeriesSettingDescriptor } from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";

type XYHostConfig = BarChartVizConfig | LineChartVizConfig | AreaChartVizConfig;
type RadarHostConfig = RadarChartVizConfig;
type HostConfig = XYHostConfig | RadarHostConfig;

type Props<TConfig extends HostConfig> = {
  fields: readonly QueryResultColumn[];
  config: TConfig;
  onConfigChange: (next: TConfig) => void;
};

/**
 * Hook to build the localized render-as options. Returned from a hook so
 * the labels stay in sync with the active Lingui locale.
 */
function useRenderAsOptions(): ReadonlyArray<{
  value: RenderAs;
  label: string;
}> {
  const { t } = useLingui();
  return [
    { value: "bar", label: t`Bar` },
    { value: "line", label: t`Line` },
    { value: "area", label: t`Area` },
  ];
}

/**
 * Form for series-aware viz types (bar / line / area / radar).
 *
 * Renders the Series fieldset first (matching the natural user flow:
 * pick what to plot, then how to bucket it), followed by the axis
 * fieldset (X axis or Category axis), followed by one Mantine
 * `<Fieldset>` per chart-level descriptor group ("Y axis", "Legend",
 * "Layout", "Grid", etc.). Descriptors whose group matches the axis
 * legend merge into the axis fieldset alongside the column picker so
 * all X-axis settings live in one visual unit.
 *
 * Single source of truth for the form layout. Each chart type only
 * differs by its descriptor registry; the surrounding structure
 * (axis picker, series cards, add button) is shared.
 */
export function SeriesAwareVizForm<TConfig extends HostConfig>({
  fields,
  config,
  onConfigChange,
}: Props<TConfig>): ReactNode {
  const { t } = useLingui();
  const isRadar = config.vizType === "radar";
  const chartDescriptors = VizConfigs.getDescriptors(config.vizType).chart;

  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
  }, [fields]);

  const updateChartPath = useCallback(
    (path: string, value: unknown) => {
      const next = pathSet(
        config as never,
        path as never,
        value as never,
      ) as TConfig;
      onConfigChange(next);
    },
    [config, onConfigChange],
  );

  const updateAxisKey = useCallback(
    (next: string | undefined) => {
      if (isRadar) {
        onConfigChange({
          ...(config as RadarHostConfig),
          nameKey: next,
        } as TConfig);
      } else {
        onConfigChange({
          ...(config as XYHostConfig),
          xAxisKey: next,
        } as TConfig);
      }
    },
    [config, isRadar, onConfigChange],
  );

  const updateSeriesAt = useCallback(
    (idx: number, nextSeries: XYSeries | RadarSeries) => {
      const series = [...config.series];
      series[idx] = nextSeries as never;
      onConfigChange({ ...config, series } as TConfig);
    },
    [config, onConfigChange],
  );

  const removeSeriesAt = useCallback(
    (idx: number) => {
      const series = removeAtIndex<(typeof config.series)[number]>(
        config.series,
        idx,
      );
      onConfigChange({ ...config, series } as TConfig);
    },
    [config, onConfigChange],
  );

  const addSeries = useCallback(() => {
    const usedKeys = new Set(
      config.series.map((s) => {
        return s.key;
      }),
    );
    const nextNumeric = numericFields.find((c) => {
      return !usedKeys.has(c.name);
    });
    if (nextNumeric === undefined) {
      return;
    }
    if (isRadar) {
      const radarConfig = config as RadarHostConfig;
      const next: RadarSeries = { key: nextNumeric.name };
      onConfigChange({
        ...radarConfig,
        series: [...radarConfig.series, next],
      } as TConfig);
    } else {
      const xyConfig = config as XYHostConfig;
      const next: XYSeries = {
        renderAs: xyConfig.vizType,
        key: nextNumeric.name,
      } as XYSeries;
      onConfigChange({
        ...xyConfig,
        series: [...xyConfig.series, next],
      } as TConfig);
    }
  }, [config, isRadar, numericFields, onConfigChange]);

  const axisKeyValue: string | undefined =
    isRadar ?
      (config as RadarHostConfig).nameKey
    : (config as XYHostConfig).xAxisKey;

  const axisLegend = isRadar ? t`Category axis` : t`X axis`;

  const groupedChartDescriptors = useMemo(() => {
    return makeBucketMap(chartDescriptors, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [chartDescriptors]);

  const axisGroupDescriptors = groupedChartDescriptors.get(axisLegend) ?? [];
  const otherGroupedDescriptors = Array.from(
    groupedChartDescriptors.entries(),
  ).filter(([group]) => {
    return group !== axisLegend;
  });

  return (
    <Stack gap="md">
      <Fieldset legend={t`Series`}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Group gap={6} align="center">
              <Tooltip
                multiline
                w={280}
                label={
                  isRadar ?
                    axisKeyValue ?
                      t`Each series is a numeric column plotted on the radial value. Values are grouped by the category axis ("${axisKeyValue}").`
                    : t`Each series is a numeric column plotted on the radial value. Pick the category axis below.`

                  : axisKeyValue ?
                    t`Each series is a numeric column plotted on the Y axis. Values are grouped by the X axis ("${axisKeyValue}").`
                  : t`Each series is a numeric column plotted on the Y axis. Pick the X axis below.`

                }
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
              disabled={config.series.length >= numericFields.length}
            >
              <Trans>Add series</Trans>
            </Button>
          </Group>

          {config.series.length === 0 ?
            <Text size="xs" c="dimmed">
              <Trans>
                Add a series to choose which numeric column drives the chart.
              </Trans>
            </Text>
          : null}

          {config.series.map((s, idx) => {
            return (
              <SeriesCard
                key={`${s.key}-${idx}`}
                fields={fields}
                numericFields={numericFields}
                series={s}
                hostVizType={config.vizType}
                isRadarHost={isRadar}
                onSeriesChange={(next) => {
                  updateSeriesAt(idx, next);
                }}
                onRemove={() => {
                  removeSeriesAt(idx);
                }}
              />
            );
          })}
        </Stack>
      </Fieldset>

      <Fieldset legend={axisLegend}>
        <Stack gap="xs">
          <Control
            label={axisLegend}
            spec={{ kind: "columnPicker", dataType: "any" }}
            value={axisKeyValue}
            onChange={(next) => {
              updateAxisKey(typeof next === "string" ? next : undefined);
            }}
            fields={fields}
          />
          {axisGroupDescriptors.map((desc) => {
            return (
              <Control
                key={desc.key}
                label={desc.label}
                spec={desc.control}
                value={pathGet(config as never, desc.key as never)}
                onChange={(next) => {
                  updateChartPath(desc.key, next);
                }}
              />
            );
          })}
        </Stack>
      </Fieldset>

      {otherGroupedDescriptors.map(([group, descs]) => {
        const legend = group === "" ? t`Chart settings` : group;
        return (
          <Fieldset key={legend} legend={legend}>
            <Stack gap="xs">
              {descs.map((desc) => {
                return (
                  <Control
                    key={desc.key}
                    label={desc.label}
                    spec={desc.control}
                    value={pathGet(config as never, desc.key as never)}
                    onChange={(next) => {
                      updateChartPath(desc.key, next);
                    }}
                  />
                );
              })}
            </Stack>
          </Fieldset>
        );
      })}
    </Stack>
  );
}

type SeriesCardProps = {
  fields: readonly QueryResultColumn[];
  numericFields: readonly QueryResultColumn[];
  series: XYSeries | RadarSeries;
  hostVizType: HostConfig["vizType"];
  isRadarHost: boolean;
  onSeriesChange: (next: XYSeries | RadarSeries) => void;
  onRemove: () => void;
};

function SeriesCard({
  numericFields,
  series,
  hostVizType,
  isRadarHost,
  onSeriesChange,
  onRemove,
}: SeriesCardProps): ReactNode {
  const { t } = useLingui();
  const renderAsOptions = useRenderAsOptions();
  const seriesRenderAs: RenderAs | "radar" =
    isRadarHost ? "radar" : (series as XYSeries).renderAs;

  const descriptors = useMemo(() => {
    const sourceModuleVizType: HostConfig["vizType"] =
      seriesRenderAs === "radar" ? "radar" : seriesRenderAs;
    return VizConfigs.getDescriptors(sourceModuleVizType).series.filter((d) => {
      return d.appliesTo === seriesRenderAs;
    });
  }, [seriesRenderAs]);

  const isComposed = !isRadarHost && seriesRenderAs !== hostVizType;
  const filtered: readonly ErasedSeriesSettingDescriptor[] =
    isComposed ?
      descriptors.filter((d) => {
        return d.composable;
      })
    : descriptors;

  const groupedDescriptors = useMemo(() => {
    return makeBucketMap(filtered, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [filtered]);

  const numericOptions = useMemo(() => {
    return numericFields.map((c) => {
      return { value: c.name, label: c.name };
    });
  }, [numericFields]);

  const setSeriesPath = useCallback(
    (path: string, value: unknown) => {
      const next = pathSet(series as never, path as never, value as never) as
        | XYSeries
        | RadarSeries;
      onSeriesChange(next);
    },
    [series, onSeriesChange],
  );

  const setKey = useCallback(
    (next: string | null) => {
      if (next === null) {
        return;
      }
      onSeriesChange({ ...series, key: next });
    },
    [series, onSeriesChange],
  );

  const setRenderAs = useCallback(
    (next: string) => {
      if (isRadarHost) {
        return;
      }
      const r = next as RenderAs;
      const xy = series as XYSeries;
      const common = { key: xy.key, label: xy.label, color: xy.color };
      const updated: XYSeries =
        r === "area" ?
          { renderAs: r, ...common, fillOpacity: 0.6 }
        : { renderAs: r, ...common };
      onSeriesChange(updated);
    },
    [isRadarHost, series, onSeriesChange],
  );

  return (
    <Card withBorder shadow="none" padding="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Box className={css.flexFillMinW0}>
            <Control
              label={t`Column`}
              spec={{ kind: "columnPicker", dataType: "numeric" }}
              value={series.key}
              onChange={(next) => {
                setKey(typeof next === "string" ? next : null);
              }}
              fields={numericFields}
            />
          </Box>
          <ActionIcon
            aria-label={t`Remove series`}
            variant="subtle"
            color="red"
            onClick={onRemove}
            mt="lg"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {!isRadarHost ?
          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              <Trans>Render as</Trans>
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              data={renderAsOptions.map((o) => {
                return { value: o.value, label: o.label };
              })}
              value={seriesRenderAs}
              onChange={setRenderAs}
            />
          </Box>
        : null}

        {Array.from(groupedDescriptors.entries()).map(([group, descs]) => {
          return (
            <Box key={group}>
              {group !== "" ?
                <Text fw={500} size="xs" c="dimmed" mt="xs" mb={4}>
                  {group}
                </Text>
              : null}
              <Stack gap="xs">
                {descs.map((desc) => {
                  return (
                    <Control
                      key={desc.key}
                      label={desc.label}
                      spec={desc.control}
                      value={pathGet(series as never, desc.key as never)}
                      onChange={(next) => {
                        setSeriesPath(desc.key, next);
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          );
        })}

        {numericOptions.length === 0 ?
          <Text size="xs" c="dimmed">
            <Trans>No numeric columns available to add to this series.</Trans>
          </Text>
        : null}
      </Stack>
    </Card>
  );
}
