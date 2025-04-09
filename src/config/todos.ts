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
        label: "Data Ontology",
        items: [
          "Create an ontology page",
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
