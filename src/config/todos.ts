/**
 * This variable is only used in dev mode as an easy way to display platform
 * todos in dev mode.
 */
export const TODOS =
  import.meta.env.DEV ?
    [
      {
        label: "Entity Designer",
        items: [
          "Set up the Supabase tables for the EntityConfig and EntityFieldConfig",
        ],
      },
      {
        label: "Data Manager",
        items: [
          "Use UUIDs for dataset ids to ensure global uniqueness",
          "Allow editing the fChange Title and ID fields to Selectsield data type",
          "Allow full CRUD of datasets in Data Manager",
          "Local datasets should be tracked with user ids",
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
        label: "Entity Browser",
        items: [
          "Create an entity browser page",
          "Display entities based off of the defined ontology",
        ],
      },
    ]
  : undefined;
