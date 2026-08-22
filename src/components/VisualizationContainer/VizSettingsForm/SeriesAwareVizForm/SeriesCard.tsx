import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  RadarSeries,
  RenderAs,
  XYSeries,
} from "$/models/vizs/SeriesConfig";
import type { AnySeriesSettingDescriptor } from "$/models/vizs/SettingDescriptor";
import type { HostConfig } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import type { ReactNode } from "react";

import { makeBucketMap, setValue } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";

import { vizSettingControlLabel } from "$/copy/vizSettingControlLabel/vizSettingControlLabel";
import { vizSettingGroupLabel } from "$/copy/vizSettingGroupLabel";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/readSetting";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.module.css";

/**
 * Build the localized render-as options. Labels stay in sync with the active
 * Lingui locale.
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

type SeriesCardProps = {
  fields: readonly QueryResultColumn[];
  numericFields: readonly QueryResultColumn[];
  series: XYSeries | RadarSeries;
  hostVizType: HostConfig["vizType"];
  isRadarHost: boolean;
  onSeriesChange: (nextSeries: XYSeries | RadarSeries) => void;
  onRemove: () => void;
};

export function SeriesCard({
  numericFields,
  series,
  hostVizType,
  isRadarHost,
  onSeriesChange,
  onRemove,
}: SeriesCardProps): ReactNode {
  const { t } = useLingui();
  const renderAsOptions = useRenderAsOptions();
  const seriesRenderAs: RenderAs | "radar" = isRadarHost
    ? "radar"
    : (series as XYSeries).renderAs;

  const descriptors = useMemo(() => {
    const sourceModuleVizType: HostConfig["vizType"] =
      seriesRenderAs === "radar" ? "radar" : seriesRenderAs;
    return VizConfigs.getDescriptors(sourceModuleVizType).series.filter((d) => {
      return d.appliesTo === seriesRenderAs;
    });
  }, [seriesRenderAs]);

  const isComposed = !isRadarHost && seriesRenderAs !== hostVizType;
  const filtered: readonly AnySeriesSettingDescriptor[] = isComposed
    ? descriptors.filter((d) => {
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
      const nextSeries = setValue(
        series as never,
        path as never,
        value as never,
      ) as XYSeries | RadarSeries;
      onSeriesChange(nextSeries);
    },
    [series, onSeriesChange],
  );

  const setKey = useCallback(
    (nextKey: string | null) => {
      if (nextKey === null) {
        return;
      }
      onSeriesChange({ ...series, key: nextKey });
    },
    [series, onSeriesChange],
  );

  const setRenderAs = useCallback(
    (nextRenderAs: string) => {
      if (isRadarHost) {
        return;
      }
      const renderAs = nextRenderAs as RenderAs;
      const xySeries = series as XYSeries;
      const sharedSeriesProps = {
        key: xySeries.key,
        label: xySeries.label,
        color: xySeries.color,
      };
      const updatedSeries: XYSeries =
        renderAs === "area"
          ? { renderAs, ...sharedSeriesProps, fillOpacity: 0.6 }
          : { renderAs, ...sharedSeriesProps };
      onSeriesChange(updatedSeries);
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
              onChange={(nextValue) => {
                setKey(typeof nextValue === "string" ? nextValue : null);
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

        {!isRadarHost ? (
          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              <Trans>Render as</Trans>
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              data={renderAsOptions.map((option) => {
                return { value: option.value, label: option.label };
              })}
              value={seriesRenderAs}
              onChange={setRenderAs}
            />
          </Box>
        ) : null}

        {Array.from(groupedDescriptors.entries()).map(([group, descs]) => {
          return (
            <Box key={group}>
              {group === "" ? null : (
                <Text fw={500} size="xs" c="dimmed" mt="xs" mb={4}>
                  {vizSettingGroupLabel(group)}
                </Text>
              )}
              <Stack gap="xs">
                {descs.map((desc) => {
                  return (
                    <Control
                      key={desc.key}
                      label={vizSettingControlLabel(desc.label)}
                      spec={desc.control}
                      value={readSetting(series, desc.key)}
                      onChange={(nextValue) => {
                        setSeriesPath(desc.key, nextValue);
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          );
        })}

        {numericOptions.length === 0 ? (
          <Text size="xs" c="dimmed">
            <Trans>No numeric columns available to add to this series.</Trans>
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
