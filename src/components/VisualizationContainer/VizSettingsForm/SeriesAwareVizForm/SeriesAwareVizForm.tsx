import {
  makeBucketMap,
  propPasses,
  removeAtIndex,
  setValue,
} from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { vizSettingControlLabel } from "$/copy/vizSettingControlLabel";
import { vizSettingGroupLabel } from "$/copy/vizSettingGroupLabel";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { useCallback, useMemo } from "react";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/readSetting";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.module.css";
import { SeriesCard } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesCard";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";
import type { RadarSeries, XYSeries } from "$/models/vizs/SeriesConfig";
import type { VizSettingGroup } from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";

type XYHostConfig = BarChartVizConfig | LineChartVizConfig | AreaChartVizConfig;
type RadarHostConfig = RadarChartVizConfig;
export type HostConfig = XYHostConfig | RadarHostConfig;

type Props<TConfig extends HostConfig> = {
  fields: readonly QueryResultColumn[];
  config: TConfig;
  onConfigChange: (nextConfig: TConfig) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
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
  layout = "stacked",
}: Props<TConfig>): ReactNode {
  const { t } = useLingui();
  const isRadar = config.vizType === "radar";
  const chartDescriptors = VizConfigs.getDescriptors(config.vizType).chart;

  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
  }, [fields]);

  const updateChartPath = useCallback(
    (path: string, value: unknown) => {
      const nextConfig = setValue(
        config as never,
        path as never,
        value as never,
      ) as TConfig;
      onConfigChange(nextConfig);
    },
    [config, onConfigChange],
  );

  const updateAxisKey = useCallback(
    (nextKey: string | undefined) => {
      if (isRadar) {
        onConfigChange({
          ...(config as RadarHostConfig),
          nameKey: nextKey,
        } as TConfig);
      } else {
        onConfigChange({
          ...(config as XYHostConfig),
          xAxisKey: nextKey,
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
      const nextSeries: RadarSeries = { key: nextNumeric.name };
      onConfigChange({
        ...radarConfig,
        series: [...radarConfig.series, nextSeries],
      } as TConfig);
    } else {
      const xyConfig = config as XYHostConfig;
      const nextSeries: XYSeries = {
        renderAs: xyConfig.vizType,
        key: nextNumeric.name,
      } as XYSeries;
      onConfigChange({
        ...xyConfig,
        series: [...xyConfig.series, nextSeries],
      } as TConfig);
    }
  }, [config, isRadar, numericFields, onConfigChange]);

  const axisKeyValue: string | undefined =
    isRadar ?
      (config as RadarHostConfig).nameKey
    : (config as XYHostConfig).xAxisKey;

  const axisGroup: VizSettingGroup = isRadar ? "Category axis" : "X axis";
  const axisLegend = vizSettingGroupLabel(axisGroup);

  const groupedChartDescriptors = useMemo(() => {
    return makeBucketMap(chartDescriptors, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [chartDescriptors]);

  const axisGroupDescriptors = groupedChartDescriptors.get(axisGroup) ?? [];
  const otherGroupedDescriptors = Array.from(
    groupedChartDescriptors.entries(),
  ).filter(([group]) => {
    return group !== axisGroup;
  });

  const groups: SettingsColumnGroup[] = [
    {
      id: "series",
      title: t`Series`,
      content: (
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
                onSeriesChange={(nextSeries) => {
                  updateSeriesAt(idx, nextSeries);
                }}
                onRemove={() => {
                  removeSeriesAt(idx);
                }}
              />
            );
          })}
        </Stack>
      ),
    },
    {
      id: "axis",
      title: axisLegend,
      content: (
        <Stack gap="xs">
          <Control
            label={axisLegend}
            spec={{ kind: "columnPicker", dataType: "any" }}
            value={axisKeyValue}
            onChange={(nextValue) => {
              updateAxisKey(
                typeof nextValue === "string" ? nextValue : undefined,
              );
            }}
            fields={fields}
          />
          {axisGroupDescriptors.map((descriptor) => {
            return (
              <Control
                key={descriptor.key}
                label={vizSettingControlLabel(descriptor.label)}
                spec={descriptor.control}
                value={readSetting(config, descriptor.key)}
                onChange={(nextValue) => {
                  updateChartPath(descriptor.key, nextValue);
                }}
              />
            );
          })}
        </Stack>
      ),
    },
    ...otherGroupedDescriptors.map(([group, groupDescriptors]) => {
      return {
        // The descriptor group is the stable identity; the title is display
        // copy, so keying on it would remount every column on a locale change.
        id: group === "" ? "chart-settings" : group,
        title: group === "" ? t`Chart settings` : vizSettingGroupLabel(group),
        content: (
          <Stack gap="xs">
            {groupDescriptors.map((descriptor) => {
              return (
                <Control
                  key={descriptor.key}
                  label={vizSettingControlLabel(descriptor.label)}
                  spec={descriptor.control}
                  value={readSetting(config, descriptor.key)}
                  onChange={(nextValue) => {
                    updateChartPath(descriptor.key, nextValue);
                  }}
                />
              );
            })}
          </Stack>
        ),
      };
    }),
  ];

  return <SettingsColumns groups={groups} layout={layout} />;
}
