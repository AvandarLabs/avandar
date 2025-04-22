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
          "Use individual DBRead, ModelRead, DBInsert, ModelInsert, etc. schemas. 6 total.",
          `Create parser maker to convert:
1) fromDbReadToModelRead;
2) fromModelInsertToDbInsert;
3) fromModelUpdateToDbUpdate`,
          `Type tests should ensure that these are consistent:
1) dbRead output <> modelRead input
2) modelInsert output <> dbInsert input
3) modelUpdate output <> dbUpdate input`,
        ],
      },
      {
        label: "Entity Designer",
        items: [
          "Add the entity_field_dimension_configs and entity_field_metric_configs tables",
          "Add the entity_field_value_extractor_configs table",
          "Add function to deep convert nulls to undefined",
          "Add type utility to deep convert nulls to undefined",
          "Use these utilities in EntityFieldConfig and EntityConfig",
          "Implement fields",
          "Validate that there is a title field and an id field in the array",
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
