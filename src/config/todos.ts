/**
 * This variable is only used in dev mode as an easy way to display platform
 * todos in dev mode.
 */
export const TODOS =
  import.meta.env.DEV ?
    [
      {
        label: "Data Manager",
        items: [
          "Use UUIDs for dataset ids to ensure global uniqueness",
          "Allow editing the field data type",
          "Allow full CRUD of datasets in Data Manager",
        ],
      },

      {
        label: "Data Explorer",
        items: [
          "Move all state management to a reducer to handle all the bi-directional interactivity between selectors",
          "Account for field data type in the allowable aggregations",
          "Display empty string as an italicized [empty value]",
          "Show a bar graph visualization",
        ],
      },
      {
        label: "Entity Designer",
        items: [
          "Create an entity designer page (ontology)",
          "Allow users to define their data models",
        ],
      },
      {
        label: "Entity Browser",
        items: [
          "Create an entity browser page",
          "Display entities based off of the defined ontology",
        ],
      },
    ]
  : undefined;
