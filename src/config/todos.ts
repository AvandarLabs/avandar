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
          "Make intelligent field data type guesses",
          "Allow editing the field data type",
          "Allow full CRUD of datasets in Data Manager",
        ],
      },
      {
        id: "data-explorer-todos",
        label: "Data Explorer Todos",
        description: "Show the to-dos for the Data Explorer app",
        items: [
          "Account for field data type in the allowable aggregations",
          "Display empty string as an italicized [empty value]",
          "Show a bar graph visualization",
        ],
      },
      {
        id: "data-ontology-todos",
        label: "Data Ontology Todos",
        description: "Show the to-dos for the Data Ontology app",
        items: [
          "Create an ontology page",
          "Allow users to define their data models",
        ],
      },
      {
        id: "entity-browser-todos",
        label: "Entity Browser Todos",
        description: "Show the to-dos for the Entity Browser app",
        items: [
          "Create an entity browser page",
          "Display entities based off of the defined ontology",
        ],
      },
    ]
  : undefined;
