
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
import { makeBucketMap, setValue } from "@utils";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { useCallback, useMemo } from "react";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.module.css";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  RadarSeries,
  RenderAs,
  XYSeries,
} from "$/models/vizs/SeriesConfig";
import type { AnySeriesSettingDescriptor } from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/readSetting";
import type { HostConfig } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";

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
  onSeriesChange: (next: XYSeries | RadarSeries) => void;
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
  const filtered: readonly AnySeriesSettingDescriptor[] =
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
      const next = setValue(series as never, path as never, value as never) as
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
                      value={readSetting(series, desc.key)}
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
