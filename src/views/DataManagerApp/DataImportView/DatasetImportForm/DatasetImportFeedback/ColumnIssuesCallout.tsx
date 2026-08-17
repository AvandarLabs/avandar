import { Callout } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
import type { ColumnCastWarning } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useColumnCastWarnings/useColumnCastWarnings";
import type { ImportedColumnError } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useImportedColumns/getImportedColumnErrors/getImportedColumnErrors";
import type { ReactNode } from "react";

type Props = {
  errors: readonly ImportedColumnError[];
  castWarnings: readonly ColumnCastWarning[];
};

/** The name problems that block the save. */
function ColumnNameErrorsCallout({
  errors,
}: Readonly<Pick<Props, "errors">>): ReactNode {
  const { t } = useLingui();
  if (errors.length === 0) {
    return null;
  }
  return (
    <Callout color="danger" title={t`Fix these column names before saving`}>
      <List size="sm">
        {errors.map((error) => {
          const columnNumber = error.columnIdx + 1;
          return (
            <List.Item key={`${error.columnIdx}-${error.kind}`}>
              {matchLiteral(error.kind, {
                empty_name: t`Column ${columnNumber} needs a name.`,
                duplicate_name: t`More than one column is named "${error.columnName}". Column names must be unique.`,
              })}
            </List.Item>
          );
        })}
      </List>
    </Callout>
  );
}

/** The lossy type choices the user may still want to keep. */
function ColumnCastWarningsCallout({
  castWarnings,
}: Readonly<Pick<Props, "castWarnings">>): ReactNode {
  const { t } = useLingui();
  if (castWarnings.length === 0) {
    return null;
  }
  return (
    <Callout
      color="warning"
      title={t`Some values do not fit the type you chose`}
    >
      <List size="sm">
        {castWarnings.map((warning) => {
          // Translated here, where `t` is in scope: `AvaDataType`'s own display
          // names are plain English, and Lingui only extracts a macro that is
          // lexically bound where it is written.
          const typeLabel = matchLiteral(warning.dataType, {
            varchar: t`Text`,
            bigint: t`Integer`,
            double: t`Number`,
            time: t`Time`,
            date: t`Date`,
            timestamp: t`Timestamp`,
            boolean: t`Boolean`,
          });
          return (
            <List.Item key={warning.columnIdx}>
              {t`"${warning.columnName}" as ${typeLabel}: ${warning.numUncastable} of ${warning.numValues} sampled values cannot be converted and would be left empty.`}
            </List.Item>
          );
        })}
      </List>
    </Callout>
  );
}

/**
 * Reports what is wrong, or merely risky, about the columns as the user has
 * edited them.
 *
 * The two kinds are deliberately separated. A name problem blocks the save,
 * because DuckDB would either refuse to build the dataset's view or silently
 * make a column unreadable. A lossy type change is a legitimate choice the user
 * may want to make anyway, so it only warns.
 */
export function ColumnIssuesCallout({
  errors,
  castWarnings,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <ColumnNameErrorsCallout errors={errors} />
      <ColumnCastWarningsCallout castWarnings={castWarnings} />
    </>
  );
}
