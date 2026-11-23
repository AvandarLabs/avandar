# Case management roadmap for contact tracing

What case management needs before a team can run contact tracing in Avandar,
using a measles outbreak as the reference workflow. Statements about the
current product are as of 2026-11-09 (`demo/measles` at `c3f85191`).

User-facing copy says case type, field, and record. The code says concept,
attribute, and individual. See section 2 of
[ontology-architecture.md](../ontology-architecture.md) for the mapping.

## Contents

1. [Summary](#1-summary)
2. [What exists today](#2-what-exists-today)
3. [Gaps, in priority order](#3-gaps-in-priority-order)
4. [How to model relationships](#4-how-to-model-relationships)
5. [Reference tools](#5-reference-tools)
6. [Where the current state is documented](#6-where-the-current-state-is-documented)
7. [Platform fixes and tests to add](#7-platform-fixes-and-tests-to-add)

## 1. Summary

Relationships between records are the biggest gap. The second is just as
foundational: storing data people type in. Most contact tracing data is
created during interviews, but today a record can only come from a dataset
sync and a field's value can only be read from a dataset. Most of the other
gaps depend on those two.

## 2. What exists today

- Case types whose fields can be joined across several datasets.
- Records created by Sync, which now flags records that have dropped out of
  the source (`individuals.missing_from_source_at`).
- One custom set of statuses per case type, with a status control on the
  record page and a status filter on the records list.
- Comments with mentions, reactions, edit history, and links to other cases
  (see [case-activity-architecture.md](case-activity-architecture.md) and
  [gadgets.md](gadgets.md)).
- Case types you can query with SQL in the Data Explorer and chat, as
  `concept_<id>` relations.
- Case types designed through chat.

## 3. Gaps, in priority order

| # | Gap | Why contact tracing needs it | Today |
| --- | --- | --- | --- |
| 1 | Relationships between records | Links from a case to each contact and to each exposure setting (a school, a clinic waiting room, a flight), and transmission chains | The ontology doc says there are "no roles (relationships) between individuals." A comment linking to another case is the only link. |
| 2 | Typed-in values and creating records by hand | Contacts named in an interview exist in no dataset, and interview answers (vaccination status, symptoms, preventive treatment given) are typed in | `attribute_mappings__manual_entry` stores no value. `concepts.allow_manual_creation` is saved, but nothing creates a record by hand. |
| 3 | Repeating sub-records | 21 days of symptom checks, and call attempts (reached, no answer, lost to follow-up) | Not modeled. Comments are the only repeating item. |
| 4 | Date math and calculated fields | Infectious period (rash onset ±4 days), end of monitoring (last exposure +21 days), treatment windows (MMR vaccine within 72 hours, immune globulin within 6 days) | A field can only pick one value from a dataset column (first, most frequent, max, min). |
| 5 | Assignment and work queues | "My contacts due today," bulk assign, reassigning when a tracer is out, matching tracers by language | The `individuals.assigned_to` column exists, but nothing in `src/` reads or writes it. |
| 6 | More than one status per record, and status history | Case classification (suspected, probable, confirmed), investigation status, and monitoring status are separate tracks, and the timeline matters | One status per record. The `case_status_changed` and `case_assigned` activity events are planned but not built. |
| 7 | Records grid, saved views, bulk actions | Lists like "unvaccinated contacts with no treatment yet" or "overdue check-ins" | Status filter only. |
| 8 | Duplicate detection and merging | The same person gets named by two cases, say one from a school and one from a church | Records must be unique per case type and external ID (`unique (concept_id, external_id)`), and records created by hand have no natural ID. |
| 9 | Turning a contact into a case | A contact who develops a rash becomes a case with contacts of their own | Needs gaps 1 and 2. |
| 10 | Outbreak views | Epidemic curve by rash onset date, transmission tree, share of contacts reached within 24 hours, treatment coverage, exposure sites on a map with time windows | Dashboards and maps exist, but there is no network graph and relationships cannot be queried. |
| 11 | Reminders, notifications, letters | Check-ins coming due, new assignments, exposure notices, school exclusion letters in the contact's language | Not built. They also need server-side jobs, which conflict with a browser-only sensitive mode in which no case data passes through Avandar's servers. |

## 4. How to model relationships

Add a **record reference field type**: a field whose value is another record,
either one or many.

- **An exposure becomes a case type of its own.** It gets `source case` and
  `contact` reference fields plus its own fields (date, setting, exposure
  type). Relationships then get fields, statuses, comments, and assignment for
  free.
- **Values come from either place.** A dataset column, such as a line list's
  "source case ID" column, read through a mapping the way fields are read
  today. Or typed in by hand and stored, which gap 2 provides. The same mixed
  rule then applies to every field type.
- **Make them queryable.** Expose reference fields as columns of the case
  type's SQL view, so a transmission chain is one recursive query in the Data
  Explorer, dashboards, and chat.
- **Plain links need no extra case type.** A link without fields of its own,
  such as a case to its household, is a reference field directly on the case
  type.
- **Settle precedence early.** Typed-in values break the ontology's
  "attribute values are never stored" rule (section 1 of
  [ontology-architecture.md](../ontology-architecture.md)), so decide which
  value wins when a field has both a dataset value and a typed-in one.

## 5. Reference tools

The WHO's free outbreak tool, [Go.Data](https://www.who.int/tools/godata), is
a useful reference for what epidemiologists expect: cases, contacts, events,
relationships with exposure details, and transmission chains.

## 6. Where the current state is documented

- Data model, Sync behavior, and known limitations:
  [ontology-architecture.md](../ontology-architecture.md), sections 1, 4, 6,
  and 16.
- Records table: `supabase/schemas/20.individuals.sql`.
- Manual entry mapping (holds no value):
  `supabase/schemas/30.attribute_mappings__manual_entry.sql`.
- Built and planned activity event kinds:
  `supabase/schemas/00.enum.activity_events__kind.sql` and
  [case-activity-architecture.md](case-activity-architecture.md).
- Status filter: `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/`.

## 7. Platform fixes and tests to add

These are not case management gaps. They are fixes and tests the platform
needs, found while running the demo.

### 7.1 Catch a forgotten query cache bump

The React Query cache is saved in IndexedDB and restored on the next load. It
is only discarded when `CACHE_SCHEMA_VERSION` in
`src/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister.ts`
or `package.json`'s version changes, and a deploy does not change the latter.
When `ad6d300a7` added `tags` to the catalog facets without bumping the
version, browsers restored facets without `tags` and the whole Add dataset
view crashed on `options.map`. `dbf921eda` bumped the version to `v10` and
added a test for that one shape, but nothing stops the next forgotten bump.

Rotating the cache on every deploy (adding the commit SHA to the buster) was
rejected: it would empty every user's cache on every deploy.

| Option | Would it have caught `tags`? | Noise | Cost |
| --- | --- | --- | --- |
| **Shape fingerprint (preferred).** Use the TypeScript compiler to fully expand the return type of every `queries` method on each `createUsableServiceClient(...)`, hash it, and compare against a committed `{ v10: "<hash>" }` table. A shape change fails until the version is bumped and the new hash recorded. | Yes | Low: fires only when cached data changes shape | About 150 lines. Loading the program takes 10 to 30 seconds, so it fits a CI script (`pnpm check:cache-shapes`) better than a unit test. |
| CI path guard. Fail a PR that touches `shared/models/**/*.types.ts` or `src/clients/**` without touching `queryPersister.ts`, with an opt-out trailer. | Yes | High: comment edits and new mutations trip it | Small |
| Validate on restore. Drop restored entries that fail a parser. | No: it hides the crash instead of catching the bump | None | Large: most queries have no parser |

The fingerprint does not cover a `useQuery` whose data is built outside a
client.

### 7.2 Keep hidden tabs from crashing the page

`Tabs` in `@avandar/ui` renders every panel at once, because Mantine's
`keepMounted` defaults to true. A crash in a tab the user has not opened, like
the Open data tab above, takes down the page around it. Either mount only the
active panel where keeping state is not needed, or wrap each panel in an
error boundary.
