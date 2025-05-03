/**
 * This variable is only used in dev mode as an easy way to display platform
 * todos in dev mode.
 */
export const TODOS =
  import.meta.env.DEV ?
    [
      {
        label: "Frontend tooling/infra",
        items: [
          "Automated database types => Zod (on yarn new:model MyModel table_name)",
          "Automated zod schemas for models => typescript types for models, with a filewatcher",
          "Write a pretty print function to print the type of an unknown object",
        ],
      },
      {
        label: "Entity Designer",
        items: [
          "Add the value extractor UIs in configuration",
          "Validate that there is a title field and an id field in the array",
        ],
      },
      {
        label: "Data Manager",
        items: [
          "Allow editing the fields data types",
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
