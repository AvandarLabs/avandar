import { matchLiteral } from "@avandar/utils";
import { Fieldset, Stack } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/SettingsColumns/SettingsColumns.module.css";
import type { CSSProperties, ReactNode } from "react";

/** One labelled group of settings controls. */
export type SettingsColumnGroup = {
  /** Stable identity for the group, used as the React key. */
  id: string;

  /** Group heading. Doubles as the fieldset legend. */
  title: string;

  /** The controls belonging to this group. */
  content: ReactNode;

  /**
   * How many grid tracks the group occupies in the `columns` layout. Defaults
   * to 1. Use it for a group whose content is materially more complex than its
   * neighbours, such as the filter tree, which otherwise gets the same width as
   * a column of single selects. Clamped by the grid, so a host with fewer
   * tracks than the span is unaffected.
   */
  span?: number;
};

/**
 * How {@link SettingsColumns} arranges its groups.
 *
 * - `columns`: groups sit side by side, dropping to fewer columns (and finally
 *   a single column) as the container narrows. For hosts with width to spend
 *   and a bounded height, such as a drawer or a full page.
 * - `stacked`: groups stack vertically in bordered fieldsets. For hosts that
 *   are narrow but free to grow tall, such as a side panel or a modal.
 */
export type SettingsColumnsLayout = "columns" | "stacked";

type Props = {
  groups: readonly SettingsColumnGroup[];
  layout: SettingsColumnsLayout;

  /**
   * Narrowest a column may shrink to, in pixels, before the grid reflows to
   * fewer columns. Only applies to the `columns` layout. Defaults to
   * `--settings-columns-min-width` from the theme.
   */
  minColumnWidth?: number;

  className?: string;
};

/**
 * Lays a set of settings groups out either as reflowing columns or as a
 * vertical stack of fieldsets.
 *
 * The `columns` layout is driven purely by the container's width via
 * `auto-fit` + `minmax`, never by the viewport. That matters because the Data
 * Explorer canvas loses 380px the moment the AI chat panel opens, with no
 * viewport change at all, and because the same forms render inside the much
 * narrower dashboard settings panel.
 */
export function SettingsColumns({
  groups,
  layout,
  minColumnWidth,
  className,
}: Props): ReactNode {
  // Left undefined so the grid falls through to the theme's floor; only a
  // caller that wants a different one writes the property.
  const gridStyle: CSSProperties | undefined =
    minColumnWidth === undefined ? undefined : (
      { ["--settings-columns-min-width" as string]: `${minColumnWidth}px` }
    );

  return matchLiteral(layout, {
    stacked: () => {
      return (
        <Stack gap="md" className={className}>
          {groups.map((group) => {
            return (
              <Fieldset key={group.id} legend={group.title}>
                {group.content}
              </Fieldset>
            );
          })}
        </Stack>
      );
    },
    columns: () => {
      return (
        <div
          className={clsx(css.settingsColumnsGrid, className)}
          style={gridStyle}
        >
          {groups.map((group) => {
            return (
              <div
                key={group.id}
                className={css.settingsColumnsColumn}
                style={
                  group.span !== undefined && group.span > 1 ?
                    { gridColumn: `span ${group.span}` }
                  : undefined
                }
              >
                <Fieldset
                  variant="unstyled"
                  legend={group.title}
                  classNames={{
                    root: css.columnFieldset,
                    legend: css.columnLegend,
                  }}
                >
                  {group.content}
                </Fieldset>
              </div>
            );
          })}
        </div>
      );
    },
  });
}
