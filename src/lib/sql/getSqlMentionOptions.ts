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
  const options: SqlMentionOption[] = [];

  for (const dataset of catalog.datasets) {
    if (_matchesQuery(dataset.name, query)) {
      options.push({
        kind: "dataset",
        label: dataset.name,
        insertText: `"${dataset.id}"`,
      });
    }
    for (const column of dataset.columns) {
      if (_matchesQuery(column.name, query)) {
        options.push({
          kind: "column",
          label: `${dataset.name}.${column.name}`,
          name: column.name,
          insertText: `"${column.name}"`,
        });
      }
    }
  }

  return options;
}
