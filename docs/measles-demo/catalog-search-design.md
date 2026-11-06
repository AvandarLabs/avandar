# Catalog search: design

Status: approved design. Follows
[catalog-field-mapping-design.md](catalog-field-mapping-design.md), which
deferred catalog search to this document.

## 1. Problem

The open data catalog has more than 5,000 listings. `DataCatalogView` loads
all of them with `DataCatalogListingClient.useGetAll({})`, builds a Fuse.js
index over six text fields in the browser, and renders every match as a DOM
node. That holds three copies of the catalog in memory: the full rows
(including the `metadata` jsonb, `description` and `notes`), the Fuse index,
and the DOM. Browser memory is what DuckDB needs for datasets and queries, so
the catalog should hold only what is on screen.

The field mapping design adds `source_metadata`, the full source record, to
every row, so fetching everything only gets heavier.

## 2. Decision

Search runs in Postgres behind one RPC that returns small pages of slim rows.
The browser asks for one page at a time as the user scrolls, and renders only
the rows in view.

| Option | Matches partial words while typing | Tolerates typos | Ranks by field | New infrastructure |
|---|---|---|---|---|
| Postgres full-text search (`tsvector`) | No | No | Yes | None |
| Postgres trigram matching (`pg_trgm`) | Yes | Yes | No | One extension |
| **Both, combined** | **Yes** | **Yes** | **Yes** | **One extension** |
| Typesense or Meilisearch | Yes | Yes | Yes | A new service, kept in sync |

Full-text search ranks a name match above a description match and matches
word forms ("vaccines" finds "vaccine"). Trigram matching covers what Fuse
gave users: a partial word while typing ("measl") and a typo. A separate
search service is not worth running and syncing at this size.

## 3. Schema

### 3.1 `pg_trgm`

`supabase/schemas/00.extension.pg_trgm.sql` installs `pg_trgm` in the
`extensions` schema, where Supabase keeps extensions. Functions run with
`search_path = ''`, so they name its functions and operators by schema:
`extensions.word_similarity(...)` and `operator(extensions.<%)`.

### 3.2 `data_catalog_listings` changes

| Object | Definition | Purpose |
|---|---|---|
| `search_vector` | Stored generated `tsvector`, `english` configuration | Full-text search |
| `data_catalog_listings__search_vector` | GIN index on `search_vector` | Full-text lookups |
| `data_catalog_listings__display_name_trgm` | GIN `gin_trgm_ops` index on `display_name` | Trigram lookups |

`search_vector` weights each field by how strongly a match there says the
listing is the one the user wants:

| Weight | Fields |
|---|---|
| A | `display_name` |
| B | `external_organization_name`, `external_service_name`, `pipeline_name` |
| C | `description`, `notes` |

Trigram matching covers `display_name` only. A name is what a user types a
fragment of. Organizations and pipelines are short, and full-text search
already matches their whole words.

When the field mapping design's columns land, `organization1_name` through
`organization4_name`, `domains` and `tags` join weight B. Rebuilding a stored
generated column rewrites the table, which takes well under a second at this
size.

## 4. The search RPC

`public.rpc_data_catalog_listings__search(p_query text, p_limit integer,
p_offset integer)`, in `supabase/schemas/50.rpc_data_catalog_listings__search.sql`.

### 4.1 Matching

A blank `p_query` (null, empty, or only whitespace) matches every listing.
Otherwise a listing matches when either holds:

- `search_vector @@ websearch_to_tsquery('english', p_query)`, so users get
  quoted phrases, `or`, and `-word` exclusion for free.
- `p_query <% display_name`: trigram word similarity of at least 0.5. The
  function sets `pg_trgm.word_similarity_threshold` to 0.5, below the 0.6
  default, so a swapped pair of letters in a short word still matches:
  "measels" scores 0.5 against "Measles", and 0.6 would miss it.

### 4.2 Order

Results are ordered so that paging is stable:

1. Score, descending: `ts_rank(search_vector, query)` plus
   `word_similarity(p_query, display_name)`. A blank query scores every row 0.
2. `display_name`, ascending.
3. `id`, ascending, to break ties.

Summing the two signals lets a close typo of a listing's name outrank a
listing that only mentions the word in its description.

### 4.3 Paging

Limit and offset. `p_limit` is clamped to between 1 and 200, and `p_offset`
to at least 0. Keyset paging over a computed score adds a cursor type and
buys nothing at this size. A pipeline that writes while someone scrolls can
shift a row across a page boundary, so the client drops a row it already has.

### 4.4 Shape

Each row carries only what the list shows, plus the total match count:

| Column | Type |
|---|---|
| `id` | `uuid` |
| `display_name` | `text` |
| `external_organization_name` | `text` |
| `pipeline_name` | `text` |
| `is_workspace_loadable` | `boolean` |
| `is_invalid` | `boolean` |
| `total_count` | `bigint`, from `count(*) over ()` |

`total_count` feeds the "Catalog (N)" header without a second request. The
window count reads every matching row, which is cheap at this size. Past
roughly 100,000 listings, replace it with an estimate.

### 4.5 Privileges

`stable`, `security invoker`, `search_path = ''`. Listings are readable by
every signed-in user under the existing RLS policy, and the RPC changes
nothing about that. `execute` is revoked from `public`, `anon`,
`authenticated` and `service_role`, then granted to `authenticated`.

## 5. Client

### 5.1 `DataCatalogListingClient.search`

A query function on the existing client, through `createRdbCrudClient`'s
`queries` option. It takes `{ query, pageSize, pageNum }` and returns
`{ rows, totalCount, nextPage }`, where `nextPage` is undefined once the
last match is loaded. Rows are `DataCatalogListing.SearchResult`: the slim
shape above in camelCase.

### 5.2 `useDataCatalogSearch`

A `useInfiniteQuery` hook beside `DataCatalogView`, following
`useConceptIndividuals`. Its key includes the debounced query, and it keeps
the previous results on screen while a new query loads. It flattens pages
and drops repeated ids.

### 5.3 The list

`DataCatalogListingList` renders through `@tanstack/react-virtual`, so the
DOM holds only the rows in view. When the last rendered row is within a few
rows of the end of what is loaded, it calls `fetchNextPage`.

### 5.4 The detail pane

The selected listing is fetched by id with all its columns. The list no
longer holds full rows, and the detail pane is the only reader of
`metadata`, `description` and the rest.

### 5.5 The empty catalog

"Nothing in the catalog yet" shows when a blank query returns a total of 0.
A non-blank query that matches nothing keeps showing "No catalog dataset
matches".

## 6. Tests

| Behavior | Where |
|---|---|
| A whole word in a name, an organization, or a description matches | pgTAP, `rpc_data_catalog_listings__search.test.sql` |
| A partial word and a typo in a name match | pgTAP |
| A name match outranks a description-only match | pgTAP |
| Pages do not overlap, and `total_count` counts every match | pgTAP |
| A blank query returns every listing | pgTAP |
| `authenticated` may execute the RPC and `anon` may not | pgTAP |
| `search` maps rows and computes `nextPage` | Vitest, `DataCatalogListingClient.test.ts` |

## 7. Out of scope

- Filtering by organization, domain or tag, and the indexes on `domains` and
  `tags`. They depend on the field mapping design's columns, and are designed
  in [catalog-field-mapping-design.md](catalog-field-mapping-design.md)
  sections 3.3, 6, and 7.
- Accent-insensitive matching. `unaccent` is not immutable, so a generated
  column cannot call it without an immutable wrapper. Add it if non-English
  listings need it.
- Semantic search.
