# Description Logic nomenclature

Internal naming for the ontology subsystem, formerly "entities" and "entity
configs". This is the dictionary for the rename tracked as P5.1 in
`docs/production-plan-world-humanitarian-day.md`, which has shipped; it now
doubles as the reference for what each name means.

**This is internal nomenclature only.** No user-facing copy changed: every
English string a user can read is byte-identical to what it was before. See
"What deliberately does not change" at the bottom.

## Why

We are adopting Description Logic (DL) vocabulary so that engineering
discussions about theory and algorithms (subsumption, the ABox as a relation,
role assertions, OBDA mappings) map one-to-one onto identifiers in the tree,
with no mental translation step. The QETL architecture reference
(`~/brain/areas/avandar/engineering/qetl/final_proposal.md`) already writes in
DL terms and treats "the ABox is not a relation" as a first-class finding; the
code should read the same way.

## The vocabulary

| DL term                       | Meaning                                     | What it is here                                           |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| **Ontology**                  | TBox + ABox for a domain                    | Everything in one workspace                               |
| **TBox**                      | Terminological layer: the axioms            | The set of concepts, their attributes, and their mappings |
| **ABox**                      | Assertional layer: the facts                | The individuals and their attribute assertions            |
| **Concept**                   | A named class of individuals                | One `concepts` row                                        |
| **Individual**                | A member of the domain                      | One `individuals` row                                     |
| **Role**                      | Binary relation between individuals         | Does not exist yet (P5.2)                                 |
| **Attribute** (concrete role) | Relation from an individual to a data value | One `concept_attributes` row                              |
| **Assertion**                 | A fact: `C(a)` or `A(a, v)`                 | One computed `AttributeAssertion`                         |
| **Mapping**                   | OBDA rule deriving assertions from a source | One `attribute_mappings__*` row                           |

### Where the layers sit

An ontology is `K = ⟨T, A⟩`. **Both halves are sets of formulas**, not objects
with ids. The TBox is _all_ the terminology at once; the ABox is _all_ the
assertions at once. A concept is one predicate appearing in TBox axioms; an
individual is one constant appearing in ABox assertions.

The SQL analogy: the TBox is the entire `CREATE TABLE` script, and a concept is
one table definition inside it. The ABox is every row in the database, and an
individual is one row.

```text
TBox   Patient ⊑ ∃hasAge.Integer     one `concepts` row + its `concept_attributes`
       ConfirmedCase ⊑ Case          subsumption (P5.3, does not exist yet)

ABox   Patient(p_001)                one `individuals` row; its `concept_id` IS
                                     the concept assertion
       hasAge(p_001, 34)             one `AttributeAssertion`
```

Note that the ABox here is **virtual**: assertions are derived on demand from
the mappings rather than stored, which is why `AttributeAssertion` has no table.

### Two rules that keep the usage honest

1. **A TBox is not a unit you can have many of.** A workspace has one TBox
   containing many _concepts_. Never write `TboxId` or `tboxes`. The production
   plan's shorthand ("a TBox extends another", "status sets per TBox") means "a
   concept subsumes another" and "status sets per concept"; that reading is
   what P5.3 will implement. This doc deliberately diverges from that shorthand.
2. **`TBox` and `ABox` are layer words.** They belong in prose, comments, and
   doc headings. Identifiers name the things _inside_ the layers, which is how
   DL literature reads: you never see an object called `TBox_1`, you see
   concepts and individuals. After this refactor `Abox` and `Tbox` appear in
   zero identifiers.

A corollary worth stating, because it is easy to get wrong: **no single client
is "the ABox".** `IndividualClient` holds the concept assertions,
`AttributeAssertionClient` holds the attribute assertions. The ABox is both
together.

## Database

### Tables

| Today                                    | New                                  |
| ---------------------------------------- | ------------------------------------ |
| `entity_configs`                         | `concepts`                           |
| `entity_field_configs`                   | `concept_attributes`                 |
| `entities`                               | `individuals`                        |
| `value_extractors__dataset_column_value` | `attribute_mappings__dataset_column` |
| `value_extractors__manual_entry`         | `attribute_mappings__manual_entry`   |

`manual_entry` is a degenerate mapping: the value is asserted directly rather
than derived from a source query. It keeps the `attribute_mappings__` prefix so
the discriminated family stays greppable.

### Enums

| Today                                        | New                                          |
| -------------------------------------------- | -------------------------------------------- |
| `entity_field_configs__value_extractor_type` | `concept_attributes__mapping_type`           |
| value `'dataset_column_value'`               | `'dataset_column'`                           |
| value `'manual_entry'`                       | unchanged                                    |
| `value_extractors__value_picker_rule_type`   | `attribute_mappings__value_picker_rule_type` |

### Columns

| Table                   | Today                    | New                    |
| ----------------------- | ------------------------ | ---------------------- |
| `individuals`           | `entity_config_id`       | `concept_id`           |
| `concept_attributes`    | `entity_config_id`       | `concept_id`           |
| `concept_attributes`    | `value_extractor_type`   | `mapping_type`         |
| `concept_attributes`    | `is_id_field`            | `is_identifier`        |
| `concept_attributes`    | `is_title_field`         | `is_label`             |
| `attribute_mappings__*` | `entity_field_config_id` | `concept_attribute_id` |

`individuals.external_id` keeps its name: it is the source-side key the
individual is matched on across datasets, and the term is accurate.
`allow_manual_creation`, `is_array`, `allow_manual_edit`, `data_type`,
`value_picker_rule_type`, `dataset_id`, `dataset_column_id`, `status`,
`assigned_to` are unchanged.

### Schema files

| Today                                                            | New                                         |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `supabase/schemas/10.entity_configs.sql`                         | `10.concepts.sql`                           |
| `supabase/schemas/20.entity_field_configs.sql`                   | `20.concept_attributes.sql`                 |
| `supabase/schemas/20.entities.sql`                               | `20.individuals.sql`                        |
| `supabase/schemas/30.value_extractors__dataset_column_value.sql` | `30.attribute_mappings__dataset_column.sql` |
| `supabase/schemas/30.value_extractors__manual_entry.sql`         | `30.attribute_mappings__manual_entry.sql`   |

Numeric prefixes are unchanged, so apply order is preserved.

### Policies, triggers, indexes, functions

Every dependent object is renamed to track its table. Notable ones:

| Today                                                      | New                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tr_entity_config__set_updated_at`                         | `tr_concept__set_updated_at`                                                           |
| `tr_entity_field_config__set_updated_at`                   | `tr_concept_attribute__set_updated_at`                                                 |
| `tr_entities__set_updated_at`                              | `tr_individuals__set_updated_at`                                                       |
| `tr_value_extractors__dataset_column_value_set_updated_at` | `tr_attribute_mappings__dataset_column_set_updated_at`                                 |
| `tr_value_extractors__manual_entry_set_updated_at`         | `tr_attribute_mappings__manual_entry_set_updated_at`                                   |
| `entity_field_configs__validate_title_and_id_fields()`     | `concept_attributes__validate_label_and_identifiers()`                                 |
| `tr_entity_field_configs__validate_title_id_fields`        | `tr_concept_attributes__validate_label_and_identifiers`                                |
| `idx_entity_configs__workspace_id`                         | `idx_concepts__workspace_id`                                                           |
| `idx_entity_field_configs__entity_config_id_workspace_id`  | `idx_concept_attributes__concept_id_workspace_id`                                      |
| `idx_dataset_column_value_extractors__efc_id_workspace_id` | `idx_attribute_mappings__dataset_column__attribute_workspace`                          |
| `idx_manual_entry_value_extractors__efc_id_workspace_id`   | `idx_attribute_mappings__manual_entry__attribute_workspace`                            |
| constraint `entities__entity_config_external_id_unique`    | `individuals__concept_external_id_unique`                                              |
| RLS policy `"User can SELECT entity_configs"`              | `"User can SELECT concepts"` (and the INSERT/UPDATE/DELETE peers, for all five tables) |

No other schema object references these tables: `app_type`, `resource_type`,
`resource_shares`, the entitlement triggers, and every RPC are untouched.

## Shared models

Directory: `shared/models/EntityConfig/` and `shared/models/entities/` collapse
into a single `shared/models/ontology/`.

```text
shared/models/ontology/
  Concept/           Concept.ts  Concept.types.ts  ConceptParsers.ts  ConceptModule.ts
  ConceptAttribute/  ConceptAttribute.ts  .types.ts  ConceptAttributeParsers.ts  ConceptAttributes.ts
  AttributeMapping/  AttributeMapping.types.ts
    DatasetColumnMapping/  .types.ts  DatasetColumnMappingParsers.ts  DatasetColumnMappings.ts
    ManualEntryMapping/    .types.ts  ManualEntryMappingParsers.ts
  Individual/          Individual.ts  Individual.types.ts  IndividualParsers.ts
  AttributeAssertion/  AttributeAssertion.ts  AttributeAssertion.types.ts
```

### Types

| Today                                             | New                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `EntityConfig` (namespace)                        | `Concept`                                                         |
| `EntityConfigModel`                               | `ConceptModel`                                                    |
| `EntityConfigId`                                  | `ConceptId`                                                       |
| `EntityConfigRead` / `Insert` / `Update` / `Full` | `ConceptRead` / `ConceptInsert` / `ConceptUpdate` / `ConceptFull` |
| `EntityConfigWith`                                | `ConceptWith`                                                     |
| `BuildableEntityConfig`                           | `BuildableConcept`                                                |
| `BuildableFieldConfig`                            | `BuildableAttribute`                                              |
| `EntityConfigModule`                              | `ConceptModule`                                                   |
| `EntityConfigParsers`                             | `ConceptParsers`                                                  |
| `IEntityConfigUtils`                              | `IConceptUtils`                                                   |
| `BindWithEntityConfig`                            | `BindWithConcept`                                                 |
| `EntityFieldConfig` (namespace)                   | `ConceptAttribute`                                                |
| `EntityFieldConfigModel`                          | `ConceptAttributeModel`                                           |
| `EntityFieldConfigId`                             | `ConceptAttributeId`                                              |
| `EntityFieldConfigRead` / `Insert` / `Update`     | `ConceptAttributeRead` / `Insert` / `Update`                      |
| `EntityFieldConfigParsers`                        | `ConceptAttributeParsers`                                         |
| `EntityFieldConfigWithValueExtractor`             | `ConceptAttributeWithMapping`                                     |
| `ValueExtractorType`                              | `AttributeMappingType`                                            |
| `EntityFieldValueExtractor`                       | `AttributeMapping`                                                |
| `EntityFieldValueExtractorId`                     | `AttributeMappingId`                                              |
| `EntityFieldValueExtractorRegistry`               | `AttributeMappingRegistry`                                        |
| `EntityFieldValueExtractorModelRegistry`          | `AttributeMappingModelRegistry`                                   |
| `DatasetColumnValueExtractorModel`                | `DatasetColumnMappingModel`                                       |
| `DatasetColumnValueExtractor*`                    | `DatasetColumnMapping*`                                           |
| `ManualEntryExtractorModel`                       | `ManualEntryMappingModel`                                         |
| `ManualEntryExtractor*`                           | `ManualEntryMapping*`                                             |
| `Entity` (namespace)                              | `Individual`                                                      |
| `EntityModel`                                     | `IndividualModel`                                                 |
| `EntityId`                                        | `IndividualId`                                                    |
| `EntityRead`                                      | `IndividualRead`                                                  |
| `EntityParsers`                                   | `IndividualParsers`                                               |
| `EntityFieldValue` (namespace)                    | `AttributeAssertion`                                              |
| `EntityFieldValueId`                              | `AttributeAssertionId`                                            |
| `EntityFieldValueRead`                            | `AttributeAssertionRead`                                          |

### Model type discriminators

`Model.Base<"EntityConfig">`, `Model.make("EntityFieldConfig", …)` and
`Model.valIsOfModelType("EntityFieldConfig")` carry a runtime `__type` string.
These change to `"Concept"`, `"ConceptAttribute"`, `"Individual"`,
`"AttributeAssertion"`. Verified safe: `__type` is never persisted to Postgres,
IndexedDB, or a URL. `dashboards.config` stores Puck blocks with raw SQL, and
`AvaMap` (which does embed a `StructuredQuery`) has no table yet.

### Field names on records

| Today                 | New                      |
| --------------------- | ------------------------ |
| `entityConfigId`      | `conceptId`              |
| `entityFieldConfigId` | `conceptAttributeId`     |
| `isIdField`           | `isIdentifier`           |
| `isTitleField`        | `isLabel`                |
| `valueExtractorType`  | `mappingType`            |
| `valueExtractor`      | `mapping`                |
| `ConceptFull.fields`  | `ConceptFull.attributes` |

## Clients

`src/clients/entities/` and `src/clients/entity-configs/` collapse into
`src/clients/ontology/`. Note this also fixes a mis-filing: today
`EntityFieldConfigClient` (a TBox concern) lives under `entities/`.

| Today                                                             | New                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| `src/clients/entity-configs/EntityConfigClient.ts`                | `src/clients/ontology/ConceptClient.ts`                  |
| `src/clients/entities/EntityFieldConfigClient.ts`                 | `src/clients/ontology/ConceptAttributeClient.ts`         |
| `src/clients/entity-configs/ValueExtractorClient.ts`              | `src/clients/ontology/AttributeMappingClient.ts`         |
| `src/clients/entity-configs/DatasetColumnValueExtractorClient.ts` | `src/clients/ontology/DatasetColumnMappingClient.ts`     |
| `src/clients/entity-configs/ManualEntryExtractorClient.ts`        | `src/clients/ontology/ManualEntryMappingClient.ts`       |
| `src/clients/entities/EntityClient.ts`                            | `src/clients/ontology/IndividualClient.ts`               |
| `src/clients/entities/EntityFieldValueClient/`                    | `src/clients/ontology/AttributeAssertionClient/`         |
| `…/getEntityFieldValues/getEntityFieldValues.ts`                  | `…/getAttributeAssertions/getAttributeAssertions.ts`     |
| `…/getEntityFieldValues/getDatasetColumnFieldValues.ts`           | `…/getAttributeAssertions/getDatasetColumnAssertions.ts` |

Clients are named after their model, as everywhere else in the tree
(`DatasetClient`, `DashboardClient`). `AttributeAssertionClient` has no table
behind it (there is no `entity_field_values` table; it was dropped in
`20250929162612`) because the assertions are derived from the mappings on
demand, but it is still the client for that model.

Its two methods split along a line worth making explicit in the names:

| Today                                  | New                               | What it returns                              |
| -------------------------------------- | --------------------------------- | -------------------------------------------- |
| `getAllEntityFieldValues`              | `getConceptExtension`             | Every individual of a concept, as a relation |
| `getEntityFieldValues`                 | `getAttributeAssertions`          | The assertions for one individual            |
| `IEntityFieldValueClient`              | `IAttributeAssertionClient`       |                                              |
| `EntityFieldValueClientQueries`        | `AttributeAssertionClientQueries` |                                              |
| `createEntityFieldValueClient`         | `createAttributeAssertionClient`  |                                              |
| `useGetEntityFieldValues`              | `useGetAttributeAssertions`       |                                              |
| `_getEntityFieldValuesByExtractorType` | `_getAssertionsByMappingType`     |                                              |

The _extension_ of a concept is the set of individuals belonging to it, so
`getConceptExtension` is the precise term for what QETL Phase 3 calls "the ABox
becomes a relation".

## Views and routes

| Today                                                      | New                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/views/EntityDesignerApp/`                             | `src/views/OntologyDesignerApp/`                                    |
| `EntityConfigCreatorView/`                                 | `ConceptCreatorView/`                                               |
| `EntityConfigCreatorStore`                                 | `ConceptCreatorStore`                                               |
| `EntityConfigCreatorState`                                 | `ConceptCreatorState`                                               |
| `entityConfigFormTypes.ts`                                 | `conceptFormTypes.ts`                                               |
| `EntityConfigFormValues` / `FormType` / `FormSubmitValues` | `ConceptFormValues` / `ConceptFormType` / `ConceptFormSubmitValues` |
| `EntityFieldFormValues`                                    | `AttributeFormValues`                                               |
| `getDefaultEntityConfigFormValues`                         | `getDefaultConceptFormValues`                                       |
| `useSubmitEntityCreatorForm`                               | `useSubmitConceptCreatorForm`                                       |
| `DatasetColumnFieldsBlock/`                                | `DatasetColumnAttributesBlock/`                                     |
| `DatasetColumnExtractorCreator`                            | `DatasetColumnMappingCreator`                                       |
| `ManualEntryFieldsBlock`                                   | `ManualEntryAttributesBlock`                                        |
| `IDConfigBlock/`                                           | `IdentifierBlock/`                                                  |
| `EntityConfigMetaView/`                                    | `ConceptMetaView/`                                                  |
| `useHydratedEntityConfig`                                  | `useHydratedConcept`                                                |
| `generateEntities/`                                        | `generateIndividuals/`                                              |
| `EntityConfigNavbar`                                       | `ConceptNavbar`                                                     |
| `EntityMetaErrorView`                                      | `ConceptMetaErrorView`                                              |
| `EntityDesignerRoot`                                       | `OntologyDesignerRoot`                                              |
| `src/views/EntityManagerApp/`                              | `src/views/IndividualManagerApp/`                                   |
| `EntityNavbar`                                             | `IndividualNavbar`                                                  |
| `SingleEntityView/`                                        | `SingleIndividualView/`                                             |
| `HydratedEntity` / `useHydratedEntity`                     | `HydratedIndividual` / `useHydratedIndividual`                      |
| `EntityManagerWithNoEntitySelected`                        | `IndividualManagerWithNoIndividualSelected`                         |
| `EntityManagerRootWithNoConfigSelected`                    | `IndividualManagerRootWithNoConceptSelected`                        |

The designer authors the terminology and is named for the product
("Ontology Designer", per the production plan). The manager is named for what
it manages, individuals, rather than for the layer they sit in.

### Routes

| Today                                                      | New                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `/$workspaceSlug/entity-designer`                          | `/$workspaceSlug/ontology-designer`                           |
| `/$workspaceSlug/entity-designer/$entityConfigId`          | `/$workspaceSlug/ontology-designer/$conceptId`                |
| `/$workspaceSlug/entity-designer/entity-creator`           | `/$workspaceSlug/ontology-designer/concept-creator`           |
| `/$workspaceSlug/entity-manager`                           | `/$workspaceSlug/individual-manager`                          |
| `/$workspaceSlug/entity-manager/$entityConfigId`           | `/$workspaceSlug/individual-manager/$conceptId`               |
| `/$workspaceSlug/entity-manager/$entityConfigId/$entityId` | `/$workspaceSlug/individual-manager/$conceptId/$individualId` |

`shared/config/AvaRoutePaths.types.ts` and `src/routeTree.gen.ts` follow.
`AppLinks` / `NavbarLinks` / `SpotlightLinks` keys change to
`ontologyDesignerHome`, `ontologyDesignerConceptView`,
`ontologyDesignerCreatorView`, `individualManagerHome`,
`individualManagerIndividualView`, and the link `key` strings to
`ontology-designer`, `concept-<id>`, `concept-creator`.

## Query layer

| Today                                          | New                                    |
| ---------------------------------------------- | -------------------------------------- |
| `QueryDataSource = Dataset \| EntityConfig`    | `= Dataset \| Concept`                 |
| `QueryColumn.makeFromEntityFieldConfig`        | `QueryColumn.makeFromConceptAttribute` |
| `runStructuredQuery` match arm `EntityConfig:` | `Concept:`                             |
| `_runEntityConfigQuery`                        | `_runConceptQuery`                     |
| `_buildEntityConfigResult`                     | `_buildConceptQueryResult`             |
| `isEntityConfigSource`                         | `isConceptSource`                      |
| `structuredQueryToSql` throw                   | message says "concept"                 |

## Other call sites

- `seed/SeedData.ts`: `entityConfigs` → `concepts`, `fields` → `attributes`.
- `seed/SeedJobs.ts`: job `createEntityConfigs` → `createConcepts`.
- `apps/desktop/sync/syncable-tables.ts`: the five new names go into
  `ACTIVE_TABLES`; the five old names are **appended to `DEPRECATED_TABLES`**,
  never removed. The generator walks the full Postgres migration history, and
  dropping a historical name from the manifest hard-errors on legacy DDL.
- `src/components/layouts/RootLayout/WorkspaceLayout.tsx`, `src/config/*Links*`.
- `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`,
  `dataExplorerUrlHydration.ts` (`entityFieldConfigs` → `conceptAttributes`).
- `src/config/FeatureFlagConfig.ts`: the `DisableManualData` doc comment.
- `docs/production-plan-world-humanitarian-day.md`: the DL reframing glossary
  is updated to point at the new names.

## Generated files (regenerate, never hand-edit)

- `shared/types/database.types.ts` — `pnpm` Supabase types generation
- `src/routeTree.gen.ts` — TanStack Router
- `apps/desktop/migrations/*.gen.sql` — the SQLite generator
- `src/i18n/locales/*/messages.ts` — Lingui compile (should produce **no diff**)

## Lingui placeholders

Four `t` / `<Trans>` messages interpolate a variable whose **name** is part of
the generated message id, so renaming the variable changes the id:

| Old placeholder                        | New placeholder         |
| -------------------------------------- | ----------------------- |
| `{entityConfigName}`                   | `{conceptName}`         |
| `{singularEntityConfigName}`           | `{singularConceptName}` |
| `{pluralEntityConfigName}`             | `{pluralConceptName}`   |
| `{fieldName}` (ontology designer only) | `{attributeName}`       |

Eleven message ids move as a result. **The visible English is unchanged in all
eleven**; only the placeholder token inside it differs. To keep the existing
translations, the msgid _and_ msgstr were rewritten in place in every locale
catalog before re-extracting, rather than letting extraction orphan them.
`lingui extract` afterwards reports **0 missing** in all seven translated
locales.

`{fieldName}` is also used by an unrelated form-validation message
(`{fieldName} must be at least {minLength} characters long`), which is
untouched: the catalog rewrite is scoped to blocks referencing the ontology
designer component.

## What deliberately does not change

- **All user-facing copy.** Every `<Trans>` body and `t` template renders the
  same English it did before, including the ones that still say "entity" and
  "field". `lingui extract` was diffed against the pre-refactor catalog to
  prove it: the only msgid changes are the eleven placeholder renames above.
- `FeatureFlag` string values (`"disable-manual-data"`), which are read from
  `.env`.
- `individuals.external_id` and the DuckDB `external_ids` CTE built in
  `getDatasetColumnAssertions.ts`.
- The `app_type` and `resource_type` enums, which never carried entity values.
- The historical table names in `DEPRECATED_TABLES`
  (`apps/desktop/sync/syncable-tables.ts`). The SQLite generator walks the full
  Postgres migration history, so the five pre-rename names must stay
  recognisable there forever.
- `EntityTable` (a Dexie type) and `DiceExtractor` / `FetchExtractorOptions`
  (QETL's own extraction step, unrelated to attribute mappings).
- No `ontologies` table is introduced. A workspace is the ontology scope today;
  an explicit container is P5 work, not a rename.
- No behavior changes.

## Migration mechanics

`supabase db diff` cannot detect a rename: left alone it emits DROP + CREATE for
all five tables, which would delete every workspace's concepts and individuals.
The migration is therefore **hand-written** with `alter table … rename to`,
`alter table … rename column`, `alter type … rename to`,
`alter type … rename value`, `alter table … rename constraint`,
`alter trigger … rename on`, `alter policy … rename to`, and
`alter function … rename to`. Every statement is metadata-only; no table is
rewritten and no row is touched.

Two details worth keeping:

- **Indexes are dropped and recreated, not renamed.** SQLite has no
  `ALTER INDEX … RENAME`, and the desktop mirror replays this history through
  the Postgres-to-SQLite generator. A statement the generator cannot express
  would leave the local schema carrying the old index names forever, so the
  four indexes take a rebuild instead.
- **Two index names had to lose their `_id` suffixes**
  (`idx_attribute_mappings__dataset_column__attribute_workspace` and its
  `manual_entry` peer). The fully spelled version exceeds Postgres' 63-byte
  identifier limit and would be silently truncated, which then shows up as
  permanent `db diff` drift.

Verified by `pnpm db:reset` followed by `supabase db diff`: the residual diff
contains **zero** ontology DDL. What remains is pre-existing `db diff` noise
that predates this branch (grant/revoke churn across all 28 public tables, and
the analytics view recreation), both listed as known caveats in the
`supabase-declarative-schema` skill.

Per `AGENTS.md` this work ran on an isolated local Supabase instance
(`ava supabase switch feat-desclogic`); run `ava supabase restore` before
merging to `develop`.
