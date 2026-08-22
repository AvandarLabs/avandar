import clsx from "clsx";
import css from "@/components/VisualizationContainer/VizSettingsForm/SeriesList/SeriesList.module.css";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

type Props = {
  /** How the owning form arranges its groups. */
  layout: SettingsColumnsLayout;

  /** The series cards. */
  children: ReactNode;
};

/**
 * Lays out a list of series cards for the forms whose only setting group is the
 * series list. In the stacked layout the cards form a column; in the columns
 * layout they spread across the width the single group would otherwise waste.
 */
export function SeriesList({ layout, children }: Props): ReactNode {
  return (
    <div
      className={clsx(
        css.seriesList,
        layout === "columns" && css.seriesListColumns,
      )}
    >
      {children}
    </div>
  );
}
