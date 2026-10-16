# NYC measles outbreak response: use case plan

Prepared for a demonstration to the Deputy Director of NYC's communicable
disease program, showing how Avandar's existing products (Case Manager, GIS,
Dashboards, Data Explorer and chat) support a Department of Health outbreak
response, and naming exactly what is missing to make that support real rather
than cosmetic.

Snapshot date: **2026-10-15**. Case counts and feature state are both
time-sensitive; re-verify before reuse.

## Contents

1. The real outbreak and the real responders
2. Data policy: real data, one named exception
3. Personas
4. Workflows to support
5. Datasets required
6. Features we already have built
7. Features we have to build
8. Recommended starting point

---

## 1. The real outbreak and the real responders

### 1.1 The outbreak, as of this snapshot

The United States is having its worst measles year since 1991. The CDC
reported **4,080 confirmed cases in 2026 as of October 8**, already 78% above
the **2,289 cases for all of 2025**; 96% of 2026 cases are outbreak-associated,
and about 95% of cases are in people who are unvaccinated or have unknown
vaccination status [[CDC]](https://www.cdc.gov/measles/data-research/index.html).

New York is now a focal point, not NYC specifically. New York State declared
a disaster emergency over its measles outbreak in early October 2026
[[Al Jazeera]](https://www.aljazeera.com/news/2026/10/6/new-york-state-declares-measles-disaster-amid-resurgence-of-disease-in-us).
The state's own numbers climbed fast: 57 confirmed cases statewide as of
September 12 (6 in NYC, 51 "rest of state")
[[WHEC]](https://www.whec.com/top-news/nys-health-department-launches-measles-dashboard-to-track-confirmed-cases/),
rising to roughly 108 statewide by early October (7 in NYC, 101 elsewhere)
[[contagionlive]](https://contagionlive.com/view/measles-update-october-9-2026).
NYC itself has stayed comparatively low and travel-linked: 14 cases in 2024,
20 in 2025, 7 in 2026 year-to-date, each case confirmed through NYC Health's
weekly-updated measles page
[[NYC Health]](https://www.nyc.gov/site/doh/health/health-topics/measles.page).
NYS DOH launched its own public measles dashboard on September 15, 2026
[[NYS DOH]](https://www.health.ny.gov/press/releases/2026/2026-09-15_measles_dashboard.htm).

This matters for the demo's framing: NYC is the comparatively well-vaccinated,
well-surveilled city inside a state in worse shape, and the story is "stay
ahead of an upstate-driven resurgence," not "contain a citywide epidemic." That
is also historically accurate: NYC's last major measles outbreak ran from an
imported case on September 30, 2018 through the city's declaration that it was
over on September 3, 2019
[[NYC mayoral press release]](https://www.nyc.gov/office-of-the-mayor/news/409-19/mayor-de-blasio-health-officials-declare-end-measles-outbreak-new-york-city),
driven by international travel into under-vaccinated Orthodox Jewish
communities in Williamsburg and Borough Park. **The total case count depends
on which window is being cited, and this plan uses 649 as the full-outbreak
figure rather than picking a single number silently:**

| Figure | Window | Source |
| --- | --- | --- |
| 649 confirmed cases (473 Williamsburg, 121 Borough Park, 93.4% Orthodox Jewish community) | Full outbreak, Sept 30, 2018 - July 15, 2019 | [peer-reviewed outbreak report, PMC6788396](https://pmc.ncbi.nlm.nih.gov/articles/PMC6788396) |
| 605 cases | Calendar year 2019 only (excludes the Oct-Dec 2018 cases) | [NYC Health measles page](https://www.nyc.gov/site/doh/health/health-topics/measles.page) |
| 285 confirmed cases | Mid-outbreak snapshot at the April 9, 2019 emergency declaration | [Brooklyn Eagle](https://brooklyneagle.com/articles/2019/04/09/measles-outbreak-city-declares-public-health-emergency-with-285-confirmed-cases/) |

Each number is correct for its own window; use 649 as the headline full-outbreak
total and name the window explicitly if quoting any other figure live. The
outbreak ended with a mandatory MMR vaccination order covering anyone six
months or older living, working, or attending school in **ZIP codes 11205,
11206, 11211, and 11249** (Williamsburg), with fines up to $1,000 for
noncompliance
[[ABC7NY]](https://abc7ny.com/post/measles-outbreak-nyc-orders-mandatory-vaccines-for-some/5239006/).
The 2026 pattern — small numbers of imported cases, each traced to international
travel, each requiring full contact tracing regardless of its size — repeats
that shape at smaller scale.

### 1.2 How DOHMH actually works a measles case

The current Health Alert Network advisory
([HAN Advisory 5, February 26, 2025](https://www.nyc.gov/assets/doh/downloads/pdf/han/advisory/2025/han-advisory-5-measles.pdf))
sets the reporting pathway that structures everything downstream: a clinician
who sees a patient with fever and rash consistent with measles must report to
DOHMH *immediately*, by phone, and explicitly **before** waiting for lab
confirmation. Confirmatory testing (RT-PCR on a nasopharyngeal swab, serology,
sometimes urine) happens after the report, not before it. This is why a real
Case Manager needs a `suspected` state that exists and is actionable before any
lab result lands, not just `confirmed`/`probable` after the fact.

From there, the 2018-19 outbreak's own retrospective describes the standing
operational playbook DOHMH already runs
[[CHEAC retrospective]](https://cheac.org/wp-content/uploads/2019/10/Measles_CHEAC_Oct2019.pdf):

- **Disease investigators** interview each confirmed or suspected case to
  build a line list (symptom onset, vaccination history, exposure locations
  and times) and identify close contacts.
- Contacts are monitored through the ~21-day incubation window; contacts with
  no evidence of immunity face exclusion from school, childcare, and
  sometimes work until the window closes or they are vaccinated.
- **Exposure-site advisories** are published (for 2026, see the Hell's
  Kitchen restaurant exposure
  [[NBC New York]](https://www.nbcnewyork.com/news/health/measles-cases-confirmed-in-manhattan-and-long-island-what-to-know/6498662/)
  and the historical hotel/museum exposures from 2018
  [[NYS DOH]](https://www.health.ny.gov/press/releases/2018/2018-02-23_potential_measles_exposures.htm)):
  a named place, a date, and a time window the public can check themselves
  against.
- **Rapid-response vaccination clinics** are stood up in affected
  neighborhoods, prioritized by where vaccination coverage is weakest.
- Geographic analysis drives that prioritization: which neighborhoods combine
  low coverage with case proximity.

DOHMH's own public epidemiology tool, **EpiQuery**
([a816-health.nyc.gov/hdi/epiquery/disease-reporting](https://a816-health.nyc.gov/hdi/epiquery/disease-reporting)),
already answers a version of "how many measles cases, where, since when": it
holds confirmed and probable cases of every reportable communicable disease
back to 2000, queryable by citywide / borough / ZIP code (140 areas) and by
age and sex, with crude rates per 100,000. This is useful context in two
directions: it is a real source of historical aggregate counts we can use
(§5), and it is the honest baseline Avandar has to be *better than*, not a
blank slate — DOHMH staff already have a working tool for exactly this
question.

---

## 2. Data policy: real data, one named exception

Every dataset in this plan is real and publicly sourced, with one deliberate
exception: **individual-level measles case and contact records** (the actual
line list a disease investigator works from) are never public. They are
protected health information under the NYC Health Code and are not something
DOHMH, the CDC, or anyone else publishes, for the same reason a hospital does
not publish its patient roster. No such dataset exists to use, by design.

For the one workflow that needs case-level records (§4, Workflow A), this plan
uses clearly labeled **synthetic** case and contact data, shaped to match the
real HAN advisory's reporting fields (symptom onset, travel history, lab
dates, vaccination status) and anchored to **real, already-public** exposure
sites and dates pulled from actual 2018 and 2026 DOHMH/NYS advisories (§1.2).
The synthetic data supplies only the names and contact details a real case
file would also have to hold privately; the places, dates, and clinical
pattern around them are factual. Every other section of this plan — outbreak
counts, vaccination coverage, boundaries, facility locations, population
denominators — is a real, named, sourced dataset.

---

## 3. Personas

| Persona | Real DOHMH role | Workflow |
| --- | --- | --- |
| Disease investigator | Bureau of Communicable Disease, Division of Disease Control | A |
| Immunization program epidemiologist | Bureau of Immunization | B |
| Public affairs / incident command lead | Public Information Office, in a declared emergency | C |
| Epidemiologist | Bureau of Communicable Disease, epi unit (EpiQuery's own audience) | D |

Every persona is fictional; every role, process, and data source behind them
is real, per §1 and §5.

---

## 4. Workflows to support

### Workflow A — Case investigation and contact tracing

**Persona:** a disease investigator who just took a phone report of a
suspected measles case (per the HAN pathway, before any lab result exists).

**Question:** Who is this person, who were they near while infectious, and
which of those contacts lack evidence of immunity and need monitoring or
vaccination before the 21-day window closes?

**What it needs to do:**

1. Open a `Suspected case` record the moment the phone report comes in: name,
   DOB, symptom onset date, travel history, exposure locations and times,
   vaccination history.
2. Promote the case through `Suspected -> Probable -> Confirmed` as lab
   results return, without losing the investigation already done.
3. Record each contact linked to that specific case (not a bare second case
   record with no relationship to the first), with their own exposure window
   and immunity status.
4. Map the case's exposure sites and the home addresses of unimmune contacts
   together, to see which contacts are geographically reachable for a
   same-day visit versus which need a phone follow-up.
5. Assign the case (and its contacts) to a specific investigator, and track
   investigation status (open / contacts traced / closed) across a caseload,
   not one record at a time.

**Avandar products involved:** Case Manager (case + contact records), GIS
(exposure-site and contact-address mapping, with jitter/suppression for
addresses too sensitive to plot precisely), Data Explorer (cross-referencing
case data against vaccination-coverage datasets).

**Real vs. synthetic data:** exposure sites and their dates are the real 2026
Hell's Kitchen restaurant exposure and the 2018 hotel/museum exposures (§1.2);
the case and contact *people* are synthetic, built to populate that real
pattern (§2).

### Workflow B — Vaccination-coverage risk mapping and targeted response

**Persona:** a Bureau of Immunization epidemiologist deciding where to send
mobile MMR vaccination clinics before the next imported case finds an
under-vaccinated pocket.

**Question:** Which NYC ZIP codes or neighborhoods combine measurably low MMR
coverage with proximity to a known case or exposure site, and which schools
or childcare centers in that radius fall below the 95% herd-immunity
threshold?

**What it needs to do:**

1. Choropleth-map real NYC childhood MMR vaccination coverage by ZIP code and
   borough (§5.2).
2. Join real NYS school-level (district-level for NYC) immunization-survey
   data to flag areas with coverage below 95%.
3. Plot real school and childcare-facility point locations within a buffer
   radius of a case or exposure site (§5.3), to generate a concrete
   candidate list for exclusion review or targeted outreach, mirroring the
   real 2018-19 exclusion-order process (§1.1).
4. Export the resulting map and candidate list as a shareable field-ready
   PDF.

**Avandar products involved:** GIS (choropleth, point layers, buffer/distance
tool, PDF export), Data Explorer (joining vaccination coverage to boundaries),
Dashboards (an internal "coverage risk" dashboard the Bureau can return to
weekly).

**Real data:** the entire workflow runs on real NYC/NYS data; no synthetic
data is needed here.

### Workflow C — Public situational dashboard

**Persona:** the public-affairs lead in a declared emergency, who needs a
public-facing page the city can point residents, press, and other local
health departments to, without exposing a single internal case record.

**Question:** What can a member of the public see about measles activity in
NYC right now, without that page ever being able to leak an internal case
file, however the internal dashboards it draws from change?

**What it needs to do:**

1. Publish a dashboard showing real case counts over time (citywide and by
   borough), real current vaccination-coverage figures, and the real,
   already-public exposure-site advisory list, modeled on the actual pattern
   NYS DOH shipped in September 2026
   [[NYS DOH dashboard]](https://www.health.ny.gov/diseases/communicable/measles/data.htm)
   and NYC's own EpiQuery (§1.2).
2. Guarantee that publishing this dashboard can never expose the internal
   case/contact data behind Workflow A, even if the same workspace holds
   both.
3. Keep the public page live and current as the underlying counts update,
   without manual re-export.

**Avandar products involved:** Dashboards (public visibility, per-dataset
publish-slice data minimization), GIS (an exported static map as a figure,
not a live embedded map — see §7).

**Real data:** entirely real; this is the one workflow whose entire point is
that it must never touch the synthetic case data at all.

### Workflow D — Epidemiological analysis (epi stats)

**Persona:** an epidemiologist in the Bureau of Communicable Disease's epi
unit, the actual audience EpiQuery and the CDC's weekly MMWR tables serve
today.

**Question:** Is this outbreak accelerating, and is it behaving the way an
imported-case, high-coverage-city outbreak should behave, or is something
off?

**What it needs to do:**

1. Build a real **epi curve**: case counts by day or week since symptom
   onset, not since report date, which is the standard first chart in any
   outbreak investigation.
2. Compute a real **attack rate / incidence rate per 100,000**, by borough or
   UHF neighborhood, using a real population denominator (§5.4) — not a raw
   case count, which is meaningless without one.
3. Check observed case spacing against the known ~21-day incubation window:
   are new cases appearing inside plausible secondary-transmission windows of
   earlier cases, or are they each independently imported (consistent with
   the real 2026 pattern, §1.1)?
4. Break down cases by age group and vaccination status (unvaccinated / one
   dose / two doses), reproducing the breakdown the CDC already publishes
   nationally, at NYC's own scale.
5. Optionally, a rolling case-count average and a rough reproduction-number
   read, to say in a sentence whether the outbreak is growing, flat, or
   shrinking.

**Avandar products involved:** Data Explorer / chat (querying case and
population data), Dashboards (an epi-curve chart type, rate calculations),
none of which exist as purpose-built features today (§7).

**Real data:** entirely real counts and denominators; only exercises the
synthetic per-case data if the demo wants to show what Workflow A's case
records would roll up into, which is optional.

---

## 5. Datasets required

Every dataset below is real and named. §5.5 is the one deliberate exception
(§2).

### 5.1 Outbreak case counts

Every source in this table is an HTML page or a web-rendered table, not a
downloadable file or API. Acquisition is deliberately **manual, not
piped**: print or screenshot-to-PDF the relevant page or table, and import it
through Avandar's existing PDF region-extraction flow (§6.4), the same
mechanism the Sudan cholera demo used on the OCHA situation report. This is a
one-time, demo-prep step (no pipeline, no parquet snapshot), and it doubles as
a live showcase of PDF import on a source type — a government dashboard page —
that a real investigator actually encounters daily. See §7.1 for why this is
the deliberate choice rather than a gap.

| Dataset | Source | Grain | Used by |
| --- | --- | --- | --- |
| CDC national measles case counts, 2025-2026, by week/state/age/vaccination status | [cdc.gov/measles/data-research](https://www.cdc.gov/measles/data-research/index.html) (HTML tables; convert to PDF and import) | National, weekly | C, D |
| NYS measles dashboard counts, by county | [health.ny.gov/diseases/communicable/measles/data.htm](https://www.health.ny.gov/diseases/communicable/measles/data.htm) (HTML dashboard; convert to PDF and import) | County, cumulative 2026 | C, D |
| NYC measles case counts by year | [nyc.gov measles page](https://www.nyc.gov/site/doh/health/health-topics/measles.page) (HTML, weekly-updated summary; convert to PDF and import) | Citywide, by year | C, D |
| NYC communicable disease surveillance data (measles, 2000-present), by borough/ZIP/age/sex, crude rate per 100k | [EpiQuery](https://a816-health.nyc.gov/hdi/epiquery/disease-reporting) (interactive query tool, HTML output; convert to PDF and import) | Borough/ZIP, historical | D |

### 5.2 Vaccination coverage (real)

| Dataset | Source | Grain | Used by |
| --- | --- | --- | --- |
| NYC Childhood Vaccination Data Explorer (MMR coverage, ages 6mo-17y) | [nyc.gov childhood vaccination data](https://www.nyc.gov/site/doh/data/data-sets/childhood-vaccination-data.page) (downloadable from the Health Department's GitHub) | Borough, ZIP code, race/ethnicity | B, C |
| NYS School Immunization Survey, "Percent Immunized Measles" | [health.data.ny.gov, dataset `btkd-y8bp`](https://health.data.ny.gov/Health/School-Immunization-Survey-Beginning-2019-20-Schoo/btkd-y8bp/about_data) | District (NYC public schools report by district, not individual school) | B |
| Historical School Immunization Survey, 2012-13 through 2018-19 | [health.data.ny.gov, dataset `5pme-xbs5`](https://health.data.ny.gov/Health/School-Immunization-Survey-From-School-Year-2012-2/5pme-xbs5/about_data) | District | B |
| NYS/NYC MMR vaccination rate by county and ZIP (outside NYC) | Linked from the HAN advisory itself | County/ZIP | B |

### 5.3 Geography and facility points (real)

| Dataset | Source | Type | Used by |
| --- | --- | --- | --- |
| Borough Boundaries | [data.cityofnewyork.us, dataset `gthc-hcne`](https://data.cityofnewyork.us/d/gthc-hcne) (water areas excluded; water-included variant at [`wh2p-dxnf`](https://data.cityofnewyork.us/d/wh2p-dxnf)) | Polygon | B, C |
| 2020 Neighborhood Tabulation Areas (NTA) | NYC Dept. of City Planning, "Bytes of the Big Apple" | Polygon | B |
| Modified ZIP Code Tabulation Areas (MODZCTA) | [data.cityofnewyork.us, dataset `pri4-ifjk`](https://catalog.data.gov/dataset/modified-zip-code-tabulation-areas-modzcta) (already used by DOHMH for COVID-19 ZIP mapping) | Polygon | B, C |
| United Hospital Fund (UHF) 42-neighborhood boundaries | [nyc.gov GIS data files](https://www.nyc.gov/site/doh/data/health-tools/maps-gis-data-files-for-download.page) (DOHMH's own standard health geography) | Polygon | D |
| School Point Locations | [data.cityofnewyork.us, dataset `jfju-ynrr`](https://catalog.data.gov/dataset/nyc-doe-public-school-location-information) | Point | B |
| DOHMH Childcare Center Inspections (includes location) | data.cityofnewyork.us | Point | B |

### 5.4 Population denominators (real)

| Dataset | Source | Grain | Used by |
| --- | --- | --- | --- |
| Demographic/Housing Profiles by Community District/PUMA (ACS 5-year) | data.cityofnewyork.us, NYC Dept. of City Planning | Community district | D |
| New York City Population by Community Districts | data.cityofnewyork.us (NYC DCP, decennial) | Community district | D |
| ZIP-code-level population breakdowns | data.cityofnewyork.us "Zip code breakdowns" | ZIP | B, D |

### 5.5 Case and contact line list (synthetic, the one exception)

Fields modeled on the HAN advisory's actual reporting pattern: name, DOB,
residence address and ZIP, symptom onset date, rash onset date, travel
history, vaccination history (dose count and dates), lab test type and date,
status (`suspected`/`probable`/`confirmed`), exposure site(s) with dates and
time windows (drawn from the real sites in §1.2), and linked contacts with
their own exposure window and immunity status. No real individual's data
appears anywhere in this set. Used by Workflow A, optionally rolled up into
Workflow D.

---

## 6. Features we already have built

This section is a description of shipped behavior, not a roadmap; every claim
cites a file.

### 6.1 Case Manager (ontology-based case records)

Internally called the ontology subsystem; user-facing name is **Case
Manager**. Full architecture in `docs/ontology-architecture.md`.

- A **case type** ("Concept") declares fields ("attributes") whose values are
  read live from imported datasets, never stored as a separate copy
  (`docs/ontology-architecture.md` §1, §4). A **record** ("Individual") is one
  row of a case type, keyed by an identifier column.
- Chat-assisted case-type design: describe a case type in natural language,
  get a prefilled draft with fields and sources, review and create it
  (`src/components/ChatPanel/CaseTypeDraftBlock/`,
  `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts`).
- **Sync records** recomputes a case type's records from its source data. As
  of commit `9cc48c3e4` ("added incremental sync support for case
  management"), this no longer resets an existing record's id, status, or
  assignment on every sync, runs automatically on case-type creation, and
  shows real progress (`docs/superpowers/archive/2026-10-12-incremental-individual-sync-design.md`).
- Records can be read individually (`src/views/IndividualManagerApp/SingleIndividualView/`)
  with a per-record Details panel and (unwired) Notes section.
- Case type data can be queried as a SQL relation (`concept_<id>`) alongside
  any other dataset through QETL (`docs/ontology-architecture.md` §8), which
  is what lets a case type participate in a Data Explorer join or a
  dashboard query.

### 6.2 GIS

Full feature inventory in `docs/design/gis/feature-home-inventory.md`;
current shipped symbology confirmed directly in
`src/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants.ts`.

- Point layers with four symbology modes: plain circle markers, proportional
  (sqrt-scaled) symbols, **clustering**, and **heatmap** density — all four
  directly relevant to plotting individual case or contact addresses without
  defaulting to a single dot size.
- Choropleth via boundary joins, with explicit "not reported" / no-data
  styling distinct from zero (demonstrated for Sudan; the same pattern
  applies to a NYC ZIP code or UHF neighborhood with no cases, which must not
  look like a borough with confirmed zero cases).
- A **buffer and distance analysis** tool (`type: "buffer"` in
  `src/views/GisApp/tools/MapToolMode.types.ts`), which is exactly the "which
  schools are within half a mile of this exposure site" operation Workflow B
  needs, plus a separate measure tool and an area-of-interest draw-to-filter
  tool.
- A **sensitivity layer** with minimum-count suppression and point
  jitter/centroid displacement, built specifically for the "do not let a map
  re-identify one person" problem that a contact's home address raises
  directly.
- Annotations (freehand, arrow, text), a time slider with animation, and
  print/PDF export with full map furniture (legend, scale bar, attribution,
  mandatory disclaimer).
- Per-map sharing via the same `ShareResourceModal` used elsewhere, though see
  §7.3 for the gap this doesn't close.

### 6.3 Dashboards

Full inventory in `docs/dashboards-and-visualizations-inventory.md`.

- Nine visualization types (table, bar, line, area, scatter, pie, funnel,
  radar, bubble), a Puck-based page editor, and global/local filters.
- A three-way **visibility model** — `draft` / `workspace` (internal
  published) / `public` — is a stored enum, not a cosmetic toggle
  (`supabase/schemas/10.dashboards.sql`).
- **Publish-slice data minimization**: per published dataset, a dashboard can
  publish only the columns actually queried (default), all columns, or a
  custom column/row allow-list, computed by `DashboardSliceBuilder`
  (`docs/dashboards-and-visualizations-inventory.md` §8.2). This is the exact
  mechanism Workflow C depends on to guarantee a public dashboard cannot leak
  a column it was never told to publish, even if the workspace also holds
  Workflow A's case data.
- Chat can append chart/text blocks directly into a dashboard being edited.

### 6.4 Data Explorer, chat, and open data

- Natural-language-to-SQL over an in-browser DuckDB engine, with the same
  nine visualization types available for ad hoc exploration.
- PDF import with **region-selection extraction**: draw a box around a table
  in a PDF, get reviewable rows (demonstrated for the Sudan cholera situation
  report). There is no OCR or automatic table detection; extraction is
  user-directed region selection only, which matters because DOHMH's own HAN
  advisories and the CDC's weekly tables are PDFs.
- An **open data catalog** with two real acquisition mechanisms:
  - `api_resource`: live fetch from a registered CKAN/HDX resource
    (`shared/open-data/CkanClient/`), used for the Sudan cholera rainfall and
    displacement data in a prior outbreak demo.
  - `pipeline_parquet`: a one-time pipeline downloads, transforms, and
    uploads a parquet snapshot into the catalog
    (`apps/pipeline-server/pipelines/world-bank__wdi/`). This is the pattern
    the structured datasets in §5.2-§5.4 need (§7.1), since NYC/NYS open data
    runs on Socrata, not CKAN. The Sudan cholera pipeline that previously lived
    alongside `world-bank__wdi` has been removed; it is no longer a
    precedent to build against.
- **Concept relations** (§6.1) let a case type's records be queried, joined,
  and aliased (`c0`, `c1`, ...) in chat-generated SQL exactly like a dataset,
  which is the mechanism that would let a ZIP-code or borough-name alias
  table reconcile inconsistent geography names across the CDC, NYS, and NYC
  sources in §5 (`docs/ontology-architecture.md` §8, "Concepts as QETL
  relations"; concept alias mechanism per
  `docs/superpowers/specs/2026-08-19-chat-concept-aliases-design.md`).

### 6.5 Permissions

Full model in `docs/permissions-architecture.md`.

- Granular per-app roles (`data_sources`, `data_explorer`, `dashboards`,
  `settings`), role groups, user groups, and Drive-style per-resource shares,
  with a `private` / `internal` / `public` audience model that is already
  precise about "public wins" semantics and about object-storage access, not
  just the database row.
- This is real, tested infrastructure, but see §7.3 for what it does not yet
  cover.

---

## 7. Features we have to build

Ordered by how directly each blocks a workflow in §4, not by estimated
effort. Several of these are already named, independently, on the product's
own roadmap (`docs/production-plan-world-humanitarian-day.md`); this section
cross-references those items rather than duplicating their numbering.

### 7.1 A real ingestion path for NYC/NYS open data — blocks §5.2-§5.4

The only live, "ask an external API for this resource" connector today
speaks **CKAN** (`shared/open-data/CkanClient/`), and the `api_service` enum
only has one value, `'ckan'`
(`supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql`).
NYC Open Data (`data.cityofnewyork.us`) and NYS Health Data
(`health.data.ny.gov`) both run on **Socrata**, not CKAN. This only applies to
the structured, file-shaped datasets in §5.2-§5.4 (vaccination coverage,
boundaries, facility points, population). §5.1's outbreak case counts are
explicitly **out of scope for any pipeline**: those sources are HTML pages
and dashboards, not files or APIs, and this plan's deliberate choice is to
convert them to PDF and import them by hand (§5.1), not to scrape them into a
pipeline.

For §5.2-§5.4, the `pipeline_parquet` access kind already exists and already
has the right precedent (`apps/pipeline-server/pipelines/world-bank__wdi/`):
a small pipeline downloads a known resource, transforms it if needed, and
registers a parquet snapshot in the open data catalog. Writing an equivalent
`apps/pipeline-server/pipelines/nyc-measles-2026/` pipeline for those datasets
is new work, but it is "write one more pipeline using an existing, proven
pattern," not a new connector type, and is sufficient for this demo.

A durable fix, for every future Socrata-hosted city or state dataset, would be
a real **Socrata connector**. This is no longer an open question: see
[`open-data-catalog-architecture.md`](../open-data-catalog-architecture.md),
which specifies a Socrata connector plus a write-back cache (fetched live
once per catalog entry, then served from Avandar's own storage for every
later workspace, same as `pipeline_parquet` today). Not required for this
demo either way - §5.2-§5.4 still ship through the `pipeline_parquet` path
above - but the generalizable version of this gap now has a real design, not
just a flag.

### 7.2 Address geocoding — blocks Workflow A, partially blocks Workflow B

Nothing in the codebase converts a street address to a latitude/longitude
(no match for "geocod" anywhere in `src/` or `shared/`). Workflow A's
contact-tracing map and Workflow B's "which facilities are within this
radius" map both assume point coordinates already exist. Real address-level
data (a contact's home address, a facility's street address without
pre-supplied coordinates) has to be geocoded before GIS can plot it. The NYC
school and childcare datasets in §5.3 already ship with coordinates, so this
gap is narrower than it sounds, but it is real for any address a disease
investigator types in directly, and for Workflow A's synthetic contact
addresses if they are authored as text rather than pre-geocoded.

### 7.3 Case-resource permissions — blocks Workflow A as a production use, not as a demo

`resource_type` in the permissions model is **only** `dashboard` and
`dataset` today (`docs/permissions-architecture.md` §5); there is no
`resource_type` for an ontology/case type or an individual case record. The
ontology tables' row-level security is workspace-membership only — "any
workspace member can create, sync, and delete case types"
(`docs/ontology-architecture.md` §4). For a real department of health, this
is disqualifying on its own: protected case data cannot be visible to every
workspace member by default the way a sales dashboard can be. This is
already named on the product roadmap as P3.2 ("extend `resource_type` to
cover GIS maps, ontology/TBox, and ABox/case resources") and depended on by
P5c ("case-mgmt permissions") in
`docs/production-plan-world-humanitarian-day.md`. It does not block a demo
inside one workspace, since the demo audience and the data owner are the same
people, but it must ship before any real department runs case data in
Avandar.

### 7.4 Case-management workflow features — blocks Workflow A as a production use

Named explicitly as not-yet-built in `docs/ontology-architecture.md` §16 and
tracked as P5b/P5c in `docs/production-plan-world-humanitarian-day.md`:

- **No roles/relationships between records.** A case and its contacts are
  today two unrelated case types with no linking field the product
  understands; "this contact belongs to this case" has to be modeled as a
  plain attribute, not a real relationship. (P5.2.)
- **No configurable status sets.** `Individual.status` is a free-text column
  defaulted to `'active'`; there is no `Suspected -> Probable -> Confirmed`
  pipeline, just a column a workspace member could type anything into.
  (P5b.1.)
- **No assignment UI or persistence beyond a bare column.**
  `Individual.assigned_to` exists in the schema with no writer and no "my
  caseload" view. (P5c.3.)
- **No comments or activity log.** The record page's `ActivityBlock` calls
  `notifyNotImplemented`. (P5c.2, P5c.5.)
- **No filterable case list.** The records screen is a single-record detail
  view plus an unfiltered, unsearchable navbar list; there is no "show me
  every open case assigned to me in ZIP 11211" grid. (P5c.6.)
- **No manual case creation or editing**, only generation from imported
  datasets. (P5c.7, P5.4.)

None of this blocks running the demo once with prepared synthetic data; all
of it blocks a real investigator using Case Manager as their actual working
tool day to day.

### 7.5 A purpose-built epidemiological statistics layer — blocks Workflow D entirely

This is the one workflow with no existing feature to lean on at all. There is
no rate calculation, no epi-curve chart, no rolling average, and no
age-standardization anywhere in `shared/` or `src/lib/` (confirmed by
grepping for the relevant terms across both directories — no matches).
Today, every one of these is "whatever SQL a person or the LLM can write
against DuckDB," using the nine generic chart types, none of which is an
epi curve.

To actually support Workflow D, Avandar needs:

- A **rate calculation** that divides a count by a population denominator and
  expresses it per 100,000 (or any chosen base), as a first-class operation
  rather than a manually written `SELECT count(*) * 100000.0 / population`.
- An **epi-curve chart template**: case counts by day/week since a date
  column (symptom onset, not report date), which is a very specific shape of
  bar/histogram the nine generic viz types do not name and do not default
  axis bucketing for.
- **Rolling/moving averages** as a selectable series transform, not a
  hand-written window function.
- Nice-to-have, not required for a first demo: a rough **R-effective /
  generation-interval** estimate and **age-standardized rates**, both
  genuinely advanced epi methods that would need their own design work
  rather than a quick SQL helper.

### 7.6 GIS cannot publish or embed in a dashboard — blocks Workflow C's "live map," not the demo

A map today is its own standalone resource at `/map`, shareable only inside
the workspace through the same `ShareResourceModal` dashboards use, but with
no public-visibility concept at all, and no "Add to dashboard" action
anywhere in the GIS or dashboard code (no match for `MapPBlock` or
"add to dashboard" in `src/views/GisApp` or `src/views/DashboardApp`). A
public situational dashboard (Workflow C) can include a map only as a static
exported image, the same workaround the Sudan cholera demo used. This is a
real limitation for a page meant to stay current without someone manually
re-exporting a PDF every time case counts change, but it does not block a
first demo, which can use a static map figure exactly as precedent already
does.

---

## 8. Recommended starting point

Workflow B needs no new product features at all — every §5.2-§5.4 dataset it
uses is real, already acquirable through the existing `pipeline_parquet`
pattern (§7.1), and every GIS/dashboard feature it needs already ships. It is
the lowest-risk, highest-credibility way to open a demo: a real choropleth of
real NYC vaccination coverage, joined to real boundaries, published as a real
public dashboard with real data-minimization guarantees. Workflow C needs the
same, plus the §5.1 case-count sources, which this plan deliberately brings in
by hand through PDF import rather than a pipeline (§5.1, §7.1) — itself a
good early beat in the demo, not a gap to route around.

Workflow A is the most visually compelling (an outbreak investigation
unfolding on a map) but is also the one place this plan deliberately
introduces synthetic data, and the one place the permissions gap in §7.3
matters even inside a single demo workspace, if the demo audience ever asks
"who else in this workspace could see this." Be ready to answer that
question directly rather than let the map speak for itself.

Workflow D is the workflow most likely to produce an audible "oh, that's the
feature" reaction from an actual epidemiologist, specifically because it is
the workflow with the least existing support. Showing the real epi-curve
shape "by hand" (a manually configured chart, explicitly narrated as a
workaround) and then naming §7.5 as exactly what would make it a
one-click feature is a stronger pitch than pretending the gap is not there.
