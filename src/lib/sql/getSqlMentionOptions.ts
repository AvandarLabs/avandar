import { isDefined } from "@utils";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types";

export type SqlMentionOption =
  | {
      kind: "dataset";
      label: string;
      insertText: string;
    }
  | {
      kind: "column";
      label: string;
      name: string;
      insertText: string;
    };

function _matchesQuery(label: string, query: string): boolean {
  if (query.length === 0) {
    return true;
  }
  return label.toLowerCase().includes(query.toLowerCase());
}

/**
 * Options shown when the user types `@` in the SQL editor (filtered by text
 * after `@`).
 */
export function getSqlMentionOptions(
  catalog: SqlDisplayCatalog,
  query: string,
): SqlMentionOption[] {
  return catalog.datasets.flatMap((dataset) => {
    const datasetOption: SqlMentionOption | undefined =
      _matchesQuery(dataset.name, query) ?
        {
          kind: "dataset",
          label: dataset.name,
          insertText: `"${dataset.id}"`,
        }
      : undefined;

    const columnOptions: SqlMentionOption[] = dataset.columns
      .filter((column) => {
        return _matchesQuery(column.name, query);
      })
      .map((column) => {
        return {
          kind: "column",
          label: `${dataset.name}.${column.name}`,
          name: column.name,
          insertText: `"${column.name}"`,
        };
      });

    return [datasetOption, ...columnOptions].filter(isDefined);
  });
}
