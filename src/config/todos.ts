/**
 * This variable is only used in dev mode as an easy way to display platform
 * todos in dev mode.
 */
export const TODOS =
  import.meta.env.DEV ?
    [
      {
        id: "data-manager-todos",
        label: "Data Manager Todos",
        description: "Show the to-dos for the Data Manager app",
        items: [
          "Load data from dexie to DuckDB WASM",
          "Add a basic query tool to query the data",
          "Display the data in a table in Data Explorer",
          "Show a bar graph visualization",
          "Allow saving to a dashboard",
          "Allow basic management of datasets in Data Import",
        ],
      },
    ]
  : undefined;
