import { makeBucketMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { useMemo } from "react";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/readSetting";
import type { AnyChartSettingDescriptor } from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";

type Props = {
  /** Chart-level descriptors to render, in registry order. */
  descriptors: readonly AnyChartSettingDescriptor[];
  /** The config the descriptors read their current values from. */
  config: object;
  /** Called with the descriptor's dotted path and the new value. */
  onSettingChange: (path: string, value: unknown) => void;
  /**
   * A single group the caller renders itself, skipped here.
   * `SeriesAwareVizForm` excludes its axis group because it merges those
   * controls into the axis fieldset alongside the column picker.
   */
  excludeGroup?: string;
};

/**
 * Renders one Mantine `<Fieldset>` per chart-level descriptor group
 * ("Y axis", "Legend", "Grid", "Layout", etc.), in registry order, with
 * one {@link Control} per descriptor inside it. Descriptors carrying no
 * `group` collect into a trailing "Chart settings" fieldset.
 *
 * Shared by every descriptor-driven settings form. `SeriesAwareVizForm`
 * uses it for the groups it does not lay out itself; the scatter and
 * bubble forms use it for all of their chart-level settings.
 */
export function ChartSettingsFieldsets({
  descriptors,
  config,
  onSettingChange,
  excludeGroup,
}: Props): ReactNode {
  const { t } = useLingui();

  const groupedDescriptors = useMemo(() => {
    return makeBucketMap(descriptors, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [descriptors]);

  const includedGroups = Array.from(groupedDescriptors.entries()).filter(
    ([group]) => {
      return group !== excludeGroup;
    },
  );

  return includedGroups.map(([group, groupDescriptors]) => {
    const legend = group === "" ? t`Chart settings` : group;
    return (
      <Fieldset key={legend} legend={legend}>
        <Stack gap="xs">
          {groupDescriptors.map((descriptor) => {
            return (
              <Control
                key={descriptor.key}
                label={descriptor.label}
                spec={descriptor.control}
                value={readSetting(config, descriptor.key)}
                onChange={(nextValue) => {
                  onSettingChange(descriptor.key, nextValue);
                }}
              />
            );
          })}
        </Stack>
      </Fieldset>
    );
  });
}
