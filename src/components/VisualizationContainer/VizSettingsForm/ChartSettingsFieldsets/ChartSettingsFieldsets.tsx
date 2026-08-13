import { makeBucketMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { vizSettingControlLabel } from "$/copy/vizSettingControlLabel/vizSettingControlLabel";
import { vizSettingGroupLabel } from "$/copy/vizSettingGroupLabel";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/readSetting";
import type {
  AnyChartSettingDescriptor,
  VizSettingGroup,
} from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";

type Props = {
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
   * controls into the axis fieldset alongside the column picker.
   */
  excludeGroup?: VizSettingGroup;
};

/**
 * Renders one Mantine `<Fieldset>` per chart-level descriptor group
 * ("Y axis", "Legend", "Grid", "Layout", etc.), in registry order, with
 * one {@link Control} per descriptor inside it. Descriptors carrying no
 * `group` collect into a trailing "Chart settings" fieldset.
 */
export function ChartSettingsFieldsets({
  descriptors,
  config,
  onSettingChange,
  excludeGroup,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  const groupedDescriptors = makeBucketMap(descriptors, {
    keyFn: (descriptor) => {
      return descriptor.group ?? "";
    },
  });

  const includedGroups = Array.from(groupedDescriptors.entries()).filter(
    ([group]) => {
      return group !== excludeGroup;
    },
  );

  return includedGroups.map(([group, groupDescriptors]) => {
    const legend =
      group === "" ? t`Chart settings` : vizSettingGroupLabel(group);
    return (
      <Fieldset key={group === "" ? "chart-settings" : group} legend={legend}>
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
      </Fieldset>
    );
  });
}
