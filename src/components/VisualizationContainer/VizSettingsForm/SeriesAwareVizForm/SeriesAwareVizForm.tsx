
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Fieldset,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";
import {
  makeBucketMap,
  propPasses,
  removeAtIndex,
  setValue,
} from "@utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { useCallback, useMemo } from "react";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/readSetting";
import { SeriesCard } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesCard";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.module.css";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";
import type { RadarSeries, XYSeries } from "$/models/vizs/SeriesConfig";
import type { ReactNode } from "react";

type XYHostConfig = BarChartVizConfig | LineChartVizConfig | AreaChartVizConfig;
type RadarHostConfig = RadarChartVizConfig;
export type HostConfig = XYHostConfig | RadarHostConfig;

type Props<TConfig extends HostConfig> = {
  fields: readonly QueryResultColumn[];
  config: TConfig;
  onConfigChange: (next: TConfig) => void;
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
}: Props<TConfig>): ReactNode {
  const { t } = useLingui();
  const isRadar = config.vizType === "radar";
  const chartDescriptors = VizConfigs.getDescriptors(config.vizType).chart;

  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
  }, [fields]);

  const updateChartPath = useCallback(
    (path: string, value: unknown) => {
      const next = setValue(
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
                value={readSetting(config, desc.key)}
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
                    value={readSetting(config, desc.key)}
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
