# Things to check before pushing new code

- In `entity_field_config.sql`, is the constraint on the `value_extractor`
  column consistent with the type of the `valueExtractor` field in
  `EntityFieldConfig.ts`? Are we checking for all equivalent keys and values
  in both the SQL and TypeScript definitions?
