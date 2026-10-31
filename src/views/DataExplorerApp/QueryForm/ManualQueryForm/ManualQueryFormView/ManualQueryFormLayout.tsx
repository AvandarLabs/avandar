import { isDefined, matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import classes from "../ManualQueryForm.module.css";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

type Props = {
  layout: SettingsColumnsLayout;
  hasQueryColumns: boolean;
  overwriteAlert: ReactNode;
  sourceFields: ReactNode;
  aggregationFields: ReactNode;
  filterFields: ReactNode;
  sortFields: ReactNode;
  limitFields: ReactNode;
};

/** Arranges manual-query controls in column or stacked settings layouts. */
export function ManualQueryFormLayout({
  layout,
  hasQueryColumns,
  overwriteAlert,
  sourceFields,
  aggregationFields,
  filterFields,
  sortFields,
  limitFields,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const groups: SettingsColumnGroup[] = [
    { id: "source", title: t`Source`, content: sourceFields },
    hasQueryColumns
      ? {
          id: "aggregations",
          title: t`Aggregations`,
          content: aggregationFields,
        }
      : undefined,
    {
      id: "filters",
      title: t`Filters (Where)`,
      content: filterFields,
      span: 2,
    },
    {
      id: "sort-limit",
      title: t`Sort & limit`,
      content: (
        <>
          {sortFields}
          {limitFields}
        </>
      ),
    },
  ].filter(isDefined);

  return matchLiteral(layout, {
    columns: () => {
      return (
        <Stack gap={0}>
          {overwriteAlert}
          <SettingsColumns groups={groups} layout="columns" />
        </Stack>
      );
    },
    stacked: () => {
      return (
        <div>
          <Stack px="sm">
            {overwriteAlert}
            {sourceFields}

            {hasQueryColumns ? (
              <Fieldset
                legend={t`Aggregations`}
                className={classes.fieldsetTranslucent}
              >
                {aggregationFields}
              </Fieldset>
            ) : null}

            <Fieldset
              legend={t`Filters (Where)`}
              className={classes.fieldsetTranslucent}
            >
              {filterFields}
            </Fieldset>

            <Fieldset
              legend={t`Sort by`}
              className={classes.fieldsetTranslucent}
            >
              {sortFields}
            </Fieldset>

            <Fieldset
              legend={t`Result size`}
              className={classes.fieldsetTranslucent}
            >
              {limitFields}
            </Fieldset>
          </Stack>
        </div>
      );
    },
  });
}
