import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";
import { OFFLINE_UNCACHED_MESSAGE } from "@/views/DataExplorerApp/formatOfflineQueryError/formatOfflineQueryError";

/**
 * Turns a failed query's raw error message into one plain-language sentence
 * a user can act on, for example the Data Explorer's error alert or the
 * chat's "That query failed" banner. Undefined when there is no error.
 */
export function useQueryErrorExplanation(
  message: string | undefined,
): string | undefined {
  const { t } = useLingui();
  if (message === undefined) {
    return undefined;
  }
  // The offline message is already written for users.
  if (message === OFFLINE_UNCACHED_MESSAGE) {
    return message;
  }
  return match(QueryErrorKind.fromMessage(message))
    .with({ kind: "missing_column" }, ({ columnName }) => {
      return t`This query uses a column named "${columnName}" that isn't in the data.`;
    })
    .with({ kind: "missing_table" }, () => {
      return t`This query uses a dataset that isn't in this workspace or hasn't finished loading.`;
    })
    .with({ kind: "missing_function" }, ({ functionName }) => {
      return t`This query uses a function, ${functionName}, that the query engine doesn't support.`;
    })
    .with({ kind: "mismatched_values" }, () => {
      return t`This query treats one kind of value as another, such as text as a number or a date, so it couldn't run.`;
    })
    .with({ kind: "grouping" }, () => {
      return t`This query mixes totals with individual rows in a way that can't be calculated.`;
    })
    .with({ kind: "syntax" }, () => {
      return t`This query isn't written correctly, so it couldn't be read.`;
    })
    .with({ kind: "blocked" }, () => {
      return t`Avandar couldn't confirm that this query only reads your datasets, so it didn't run it.`;
    })
    .with({ kind: "out_of_memory" }, () => {
      return t`This query needs more memory than your browser has available. Try a narrower question, such as a shorter date range or fewer places.`;
    })
    .with({ kind: "cancelled" }, () => {
      return t`This query was stopped before it finished.`;
    })
    .with({ kind: "unknown" }, () => {
      return t`Something went wrong while running this query.`;
    })
    .exhaustive();
}
