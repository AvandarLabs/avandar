/**
 * Regular-expression source for a product record UUID in persisted workspace
 * routes. Used by `getRecordIdFromPageUrl`, `runMapFlow`, and
 * `openOrCreateCaseType` to match `/map/<uuid>`, `/ontology-designer/<uuid>`,
 * and other saved record URLs.
 */
export const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
