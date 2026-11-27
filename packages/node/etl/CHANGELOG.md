# @avandar/etl

## 0.4.0

### Patch Changes

- Updated dependencies []:
  - @avandar/utils@0.4.0

## 0.3.0

### Minor Changes

- feat(etl): resume incremental crawls from stored checkpoints (102ae36)

- feat(etl): select a page's connections, enforcing order, window, and limit (1d54371)

- feat(etl): read catalog field paths and coerce mapped values (24af95a)

- refactor(etl)!: read per-pipeline loadability overrides from the pipeline config (26993b2)

- refactor(catalog)!: keep only unmapped source fields in additional_source_metadata (2d61eb9)

- feat(etl): record each run's start, crawls, and outcome (3047115)

- feat(etl): crawl drives page by page and run incrementally from the high-water mark (32d952e)

- feat(etl)!: write each listing and its relation columns in one transaction (39cf8f1)

- feat(open-data): copy JSON sources, and check freshness by each listing's own probe (3f74d50)

- feat(etl): add scope-key validation and checkpoint rules (407586a)

- feat(etl): record the producing scope on every listing row (442ae47)

- feat(etl): leave the paths a field mapping consumes out of a source record (4d1d2a7)

- feat(etl): record each drive's organization labels and link listings to it (4d4b6b4)

- feat(etl): mark store failures a retry can fix as EtlTransientStoreError (4dc0c52)

- feat(etl): add the engine's public types, output contract, and in-memory stores (51e82a6)

- feat(etl): add a Supabase checkpoint store (5365358)

- feat(etl): let a pipeline manifest declare how its listings are downloaded (5520abf)

- feat(etl)!: replace the module-based EtlEngine with an engine that owns the Supabase load (60a12a7)

- feat(etl): record executions through the Supabase functions (6ec0ece)

- feat(etl): parse per-pipeline catalog field mapping configs (9b62c64)

- feat(etl): add execution store types and a never-fatal wrapper (a215270)

- feat(etl): add a per-crawl metrics recorder with an injectable clock (a85a9f2)

- feat(etl): crawl and resume each scope of each drive (b0034cd)

- feat(etl): compile pipeline field mappings, importing each script once (b191f4c)

- feat(etl): time each crawl's stages and count what they worked on (b4ee3b0)

- feat(etl): write organization levels, domains, tags, and the source record (b5a0382)

- feat(etl): build, hash, and upload Parquet relations with engine metadata (b67c031)

- feat(etl): decide each listing's workspace loadability from a shared YAML config (bdba34b)

- feat(etl): allow a relation with no columns (c8171af)

- feat(etl): add Supabase-backed listings and object stores with an integration suite (d31be06)

- feat(etl): build contract rows from relations and detect unchanged rows (d3ae27a)

- feat(etl): pace store writes to the database and retry transient failures (d9f53c3)

- feat(etl): resolve each drive's run window from mode, since, and high-water mark (e098ed3)

- feat(etl): load one page of relations, writing only rows that changed (e7d4d3a)

- feat(pipelines): print live progress during ava pipeline run (f2db070)

- feat(etl): record whether each listing's column types are verified (f7d8123)

- feat(etl): add the checkpoint store contract and an in-memory store (fed919f)

### Patch Changes

- fix(pipelines): reject invalid run options with a 400 and parse flags strictly (0654d32)

- fix(etl): retry run history writes that fail transiently (0a828d4)

- fix(etl): protect the high-water mark from reappearing and newer relations (0e9d225)

- docs(etl): fix stale scope and checkpoint wording (1f10554)

- chore(etl): drop the unused @avandar/modules dependency (22ec454)

- fix(etl): ignore future-dated rows when reading the high-water mark (27b9831)

- fix(etl): make the in-memory execution store match the database functions (29d6f2f)

- Formatted files (2e5214b)

- fix(etl): reject non-ISO dates and undefined list items in catalog coercion (2fedf1b)

- chore(catalog): apply the pre-push formatter to the loadability changes (34a34d8)

- fix(etl): record the setup time a run spent before listing failed (34d77dd)

- fix(etl): repair relation columns that a failed write left behind (3669c70)

- chore(catalog): apply the formatter to the catalog schema and label tests (4291d25)

- fix(etl): keep drive errors and validate the run limit (447a923)

- refactor(catalog): read organization1_name and the new listing columns (4499fce)

- fix(etl): refuse connections whose timestamp is not a valid date (4d845cb)

- fix(etl): record the executing checkout's commit, whole-byte sizes, and fix review nits (599cb5d)

- chore(etl): format the pipeline config parser (5bb703a)

- test(etl): pin checkpoint and scope-key boundaries, and skip invalid timestamps (6121f20)

- fix(etl): cap each listings write at 4 MiB of JSON (62ffe54)

- chore: apply formatter and wrap long comments (648d48a)

- docs(etl): describe crawl scopes, checkpoints, and pruning (6c9450f)

- docs(catalog): document indexing every asset behind is_workspace_loadable (7127981)

- fix(etl): read every matching listing and harden the Supabase stores (7934e1d)

- refactor(open-data): remove the 25 MB relay and its raw-bytes cache (86f234d)

- fix(etl): re-upload Parquet when its bucket or path changes (9267773)

- refactor: move createModuleFactory callers to named create calls (9377eb6)

- fix(etl): write a drive row only for crawls that run (937a118)

- test(etl): make the in-memory stores behave like Postgres (96ec5db)

- fix(etl): retry a crawl's drive row write when it fails transiently (aa5eefa)

- refactor(etl): share error names, the chunk helper, and the Parquet path (b1a48ef)

- fix(etl): name the config file on YAML errors and explain non-text values (bf8e7cf)

- docs(etl): document the engine's run modes and output contract (cefa9b6)

- docs(etl): correct how gaps and column sets are repaired (e29c2f4)

- refactor(etl): call the run window's lower bound a checkpoint (e76e74f)

- docs(etl): document pipeline configs, field mapping, and drives (e8e592d)

- fix(etl): refuse two drives with the same key (ebf121b)

- docs(etl): make the usage example self-contained (ed66326)

- fix(etl): compare listing metadata the way Postgres stores it (f34df03)

- refactor(etl): name the drive label lookup getOrganizationLabelsFromDrive (f82a67e)

- Updated dependencies []:
  - @avandar/utils@0.3.0

## 0.2.0

### Minor Changes

- Replace prettier with oxfmt ([#289](https://github.com/AvandarLabs/avandar/issues/289))

### Patch Changes

- Updated dependencies []:
  - @avandar/utils@0.2.0
  - @avandar/modules@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @avandar/modules@0.1.2
  - @avandar/utils@0.1.2

## 0.1.1

### Patch Changes

- [`77b4eda`](https://github.com/AvandarLabs/avandar/commit/77b4eda7b1f18c333cac890d54d9d077ce651f76) Thanks [@jpsyx](https://github.com/jpsyx)! - Publish over npm trusted publishing (OIDC) instead of a long-lived npm token.
  No functional or API changes; package contents are identical to 0.1.0.
- Updated dependencies [[`77b4eda`](https://github.com/AvandarLabs/avandar/commit/77b4eda7b1f18c333cac890d54d9d077ce651f76)]:
  - @avandar/modules@0.1.1
  - @avandar/utils@0.1.1
