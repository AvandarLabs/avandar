import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { useChartSettingGroups } from "@/components/VisualizationContainer/VizSettingsForm/useChartSettingGroups";
import type {
  AnyChartSettingDescriptor,
  VizSettingGroup,
} from "$/models/vizs/SettingDescriptor";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
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

  /** A single group the caller renders itself, skipped here. */
  excludeGroup?: VizSettingGroup;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
 * Renders one group per chart-level descriptor group ("Y axis", "Legend",
 * "Grid", "Layout", etc.), in registry order, through {@link SettingsColumns}
 * so the caller's `layout` decides whether they stack or reflow into columns.
 *
 * For a form that also contributes groups of its own, call
 * {@link useChartSettingGroups} directly and render one `SettingsColumns` over
 * the combined list instead; that keeps the `columns` layout a single grid.
 */
export function ChartSettingsFieldsets({
  descriptors,
  config,
  onSettingChange,
  excludeGroup,
  layout = "stacked",
}: Readonly<Props>): ReactNode {
  const groups = useChartSettingGroups({
    descriptors,
    config,
    onSettingChange,
    excludeGroup,
  });

  return <SettingsColumns groups={groups} layout={layout} />;
}
