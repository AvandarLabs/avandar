import { makeBucketMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { vizSettingControlLabel } from "$/copy/vizSettingControlLabel/vizSettingControlLabel";
import { vizSettingGroupLabel } from "$/copy/vizSettingGroupLabel";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/readSetting";
import type {
  AnyChartSettingDescriptor,
  VizSettingGroup,
} from "$/models/vizs/SettingDescriptor";
import type { SettingsColumnGroup } from "@/components/SettingsColumns/SettingsColumns";

type Options = {
  /** Chart-level descriptors to render, in registry order. */
  descriptors: readonly AnyChartSettingDescriptor[];

  /** The config the descriptors read their current values from. */
  config: object;

  /** Called with the descriptor's dotted path and the new value. */
  onSettingChange: (
    options: Readonly<{ path: string; value: unknown }>,
  ) => void;

  /**
   * A single group the caller renders itself, skipped here.
   * `SeriesAwareVizForm` excludes its axis group because it merges those
   * controls into the axis group alongside the column picker.
   */
  excludeGroup?: VizSettingGroup;
};

/**
 * Turns chart-level descriptors into one {@link SettingsColumnGroup} per
 * descriptor group ("Y axis", "Legend", "Grid", "Layout", etc.), in registry
 * order, with one {@link Control} per descriptor inside it. Descriptors
 * carrying no `group` collect into a trailing "Chart settings" group.
 *
 * Returns groups rather than rendered fieldsets so a caller can hand them to a
 * single `SettingsColumns` alongside groups of its own, which is what keeps the
 * `columns` layout one reflowing grid instead of several stacked ones.
 */
export function useChartSettingGroups({
  descriptors,
  config,
  onSettingChange,
  excludeGroup,
}: Readonly<Options>): SettingsColumnGroup[] {
  const { t } = useLingui();

  const groupedDescriptors = useMemo(() => {
    return makeBucketMap(descriptors, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [descriptors]);

  return Array.from(groupedDescriptors.entries())
    .filter(([group]) => {
      return group !== excludeGroup;
    })
    .map(([group, groupDescriptors]) => {
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
                    onSettingChange({ path: descriptor.key, value: nextValue });
                  }}
                />
              );
            })}
          </Stack>
        ),
      };
    });
}
