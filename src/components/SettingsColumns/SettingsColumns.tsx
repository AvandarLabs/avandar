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
};

/**
 * How {@link SettingsColumns} arranges its groups.
 *
 * - `columns`: groups sit side by side, dropping to fewer columns (and finally
 *   a single column) as the container narrows. For bounded-height hosts like
 *   the Data Explorer drawer.
 * - `stacked`: groups stack vertically in bordered fieldsets. For narrow hosts
 *   like the dashboard editor's settings panel.
 */
export type SettingsColumnsLayout = "columns" | "stacked";

/** Narrowest a column may get before the grid drops to fewer columns. */
const DEFAULT_MIN_COLUMN_WIDTH = 220;

type Props = {
  groups: readonly SettingsColumnGroup[];
  layout: SettingsColumnsLayout;

  /**
   * Narrowest a column may shrink to, in pixels, before the grid reflows to
   * fewer columns. Only applies to the `columns` layout.
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
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  className,
}: Props): ReactNode {
  if (layout === "stacked") {
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
  }

  const gridStyle = {
    "--settings-columns-min-width": `${minColumnWidth}px`,
  } as CSSProperties;

  return (
    <div className={clsx(css.grid, className)} style={gridStyle}>
      {groups.map((group) => {
        return (
          <div key={group.id} className={css.column}>
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
}
