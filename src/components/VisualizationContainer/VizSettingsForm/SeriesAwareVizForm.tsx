import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { pathGet, pathSet } from "$/models/vizs/SettingDescriptor";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { useCallback, useMemo } from "react";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control";
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
function _useRenderAsOptions(): ReadonlyArray<{
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
 * Renders the host's chart-level descriptors, then one card per
 * series with its column picker, `renderAs` switcher, and series-level
 * descriptors (filtered by `composable` when embedded in a foreign
 * host).
 *
 * Single source of truth for the form layout. Each chart type only
 * differs by its descriptor registry; the surrounding structure
 * (X/name picker, series cards, add button) is shared.
 */
export function SeriesAwareVizForm<TConfig extends HostConfig>({
  fields,
  config,
  onConfigChange,
}: Props<TConfig>): JSX.Element {
  const { t } = useLingui();
  const isRadar = config.vizType === "radar";
  const chartDescriptors = VizConfigs.getDescriptors(config.vizType).chart;

  const numericFields = useMemo(() => {
    return fields.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
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
      const series = config.series.filter((_, i) => {
        return i !== idx;
      });
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

  const groupedChartDescriptors = useMemo(() => {
    return _groupBy(chartDescriptors, (d) => {
      return d.group ?? "";
    });
  }, [chartDescriptors]);

  return (
    <Stack gap="md">
      <Control
        label={isRadar ? t`Category axis` : t`X axis`}
        spec={{ kind: "columnPicker", dataType: "any" }}
        value={axisKeyValue}
        onChange={(next) => {
          updateAxisKey(typeof next === "string" ? next : undefined);
        }}
        fields={fields}
      />

      {Array.from(groupedChartDescriptors.entries()).map(([group, descs]) => {
        return (
          <Box key={group}>
            {group !== "" ?
              <Text fw={500} size="sm" c="dimmed" mb="xs">
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
                    value={pathGet(config as never, desc.key as never)}
                    onChange={(next) => {
                      updateChartPath(desc.key, next);
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        );
      })}

      <Divider />

      <Group justify="space-between">
        <Group gap={6} align="center">
          <Title order={5}>
            <Trans>Series</Trans>
          </Title>
          <Tooltip
            multiline
            w={280}
            label={
              isRadar ?
                axisKeyValue ?
                  t`Each series is a numeric column plotted on the radial value. Values are grouped by the category axis ("${axisKeyValue}").`
                : t`Each series is a numeric column plotted on the radial value. Pick the category axis above.`
              : axisKeyValue ?
                t`Each series is a numeric column plotted on the Y axis. Values are grouped by the X axis ("${axisKeyValue}").`
              : t`Each series is a numeric column plotted on the Y axis. Pick the X axis above.`
            }
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
          disabled={config.series.length >= numericFields.length}
        >
          <Trans>Add series</Trans>
        </Button>
      </Group>

      <Stack gap="sm">
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
}: SeriesCardProps): JSX.Element {
  const { t } = useLingui();
  const renderAsOptions = _useRenderAsOptions();
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
    return _groupBy(filtered, (d) => {
      return d.group ?? "";
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
      let updated: XYSeries;
      if (r === "area") {
        updated = { renderAs: r, ...common, fillOpacity: 0.6 };
      } else {
        updated = { renderAs: r, ...common };
      }
      onSeriesChange(updated);
    },
    [isRadarHost, series, onSeriesChange],
  );

  return (
    <Card withBorder shadow="none" padding="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
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

function _groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    let arr = map.get(k);
    if (arr === undefined) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(item);
  }
  return map;
}
