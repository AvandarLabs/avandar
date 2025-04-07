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
          "Field names of the data grid should depend on the returned data (if there are aggregations it changes)",
          "Make intelligent field data type guesses",
          "Allow editing the field data type",
          "Account for field data type in the allowable aggregations",
          "Display empty string as an italicized [empty value]",
          "Show a bar graph visualization",
          "Allow saving to a dashboard",
          "Allow basic management of datasets in Data Import",
        ],
      },
    ]
  : undefined;
