# Sudan cholera 2025 demo runbook

This is an internal how-to guide for a 10 to 12 minute Avandar demonstration.
It contains three complete narrative paths, the required preparation, the
feature constraints, and the decision rule for choosing the live path.

The recommended path is **Path 1: The blank is a signal**. It has the clearest
arc, uses the supplied Sudan cholera source directly, and finishes with a map
and PDF that an emergency response team could share immediately.

For the current branch and integration status, see
[`sudan-cholera-2025-integration-reference.md`](./sudan-cholera-2025-integration-reference.md).

## Non-negotiable framing

- The country is Sudan.
- The outbreak is the 2025 cholera outbreak.
- The story does not treat missing reports as zero cases or zero deaths.
- The story acknowledges that the labels "cholera" and "acute watery
  diarrhea" have been shaped by political and institutional context.
- Conflict, displacement, damaged health services, weak surveillance, and
  damaged water and sanitation infrastructure are part of the analysis.
- The demonstration makes an operational prioritization argument. It does not
  claim that displacement or rainfall caused a particular state-level burden.
- West Darfur and Central Darfur are represented as "not reported" in the 3
  July source, not as zero.

## Shared persona and opening

**Persona:** Mariam Idris, a fictional emergency information manager working
with a cholera response coordination team in Port Sudan on 3 July 2025.

**Opening line:**

> Mariam has ten minutes before the response meeting. She has a situation
> report, a displacement workbook, and boundary data. Her job is not merely to
> find the largest number. Her job is to decide where the evidence supports
> immediate action, and where the absence of evidence is itself operationally
> important.

This persona is fictional. The source documents and data are real.

## Common preparation

Prepare these inputs before rehearsal:

1. Copy the three supplied PDFs into the demo pack:
   - `/Users/juanpablosarmiento/Downloads/Sudan_Cholera_Operational_Update_3 July 2025 (3).pdf`
   - `/Users/juanpablosarmiento/Downloads/IntlMedCorps-SudanCholeraResponse_SitRep1 (1).pdf`
   - `/Users/juanpablosarmiento/Downloads/Enhancing Disease Surveillance In Conflict Settings_ An Ecologica (1).pdf`
2. Download the 25 June 2025 IOM DTM workbook from the HDX source listed in
   [Data sources](#data-sources).
3. Download Sudan administrative boundaries. Convert the Admin 1 geometry to
   CSV with a GeoJSON string or WKT geometry column before the demo. Direct
   arbitrary GeoJSON file upload is not part of the current feature set.
4. Prepare a clean CSV version of the 3 July state-level cholera deaths as a
   fallback. Include an explicit `reporting_status` column.
5. If using Path 2, pre-register the exact WFP rainfall resource in the Open
   Data catalog. The product can acquire a registered CKAN/HDX resource, but it
   does not provide arbitrary live HDX search.
6. If using Path 3, pre-create the Sudan State concept and its state-name alias
   mappings. Do not spend live-demo time entering 18 state records.
7. Start from an isolated, reset local Supabase stack. A previously observed
   PDF save failure was caused by a stale shared local schema missing the PDF
   RPC, not by the selection or extraction interface.
8. Rehearse each path from a fresh seeded workspace. Keep the prepared CSV
   fallback visible in the file picker.

The administrative boundary dataset contains 19 Admin 1 features because it
includes Abyei PCA. The health and displacement sources use Sudan's 18 states.
Filter or explain Abyei PCA explicitly rather than allowing it to look like a
failed health-data join.

## Path 1: The blank is a signal

**Recommendation:** Primary demo path.

**Question:** Where should a response team act first when the highest recorded
burden and the weakest reporting coverage are not the same places?

**Arc:** A PDF that looks like a static endpoint becomes an auditable dataset,
then a decision map. The turn in the story is that the two blanks on the map
are not cleaned away. They become a second kind of priority.

**Shareable deliverable:**
`sudan-cholera-response-priorities-2025-07-03.pdf`, containing the map, legend,
source date, reporting-status note, and operational annotations.

**Win:** Mariam leaves the meeting with two defensible action lists:

1. High recorded burden, for immediate treatment, supplies, and WASH response.
2. Unknown burden, for surveillance support, rapid verification, and protected
   communication channels.

### Live run of show

| Time        | Action                                                                                | Story beat                                                              | Feature shown                                 |
| ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| 0:00-1:00   | Introduce Mariam and open the OCHA 3 July PDF.                                        | The evidence begins in a source designed for reading, not analysis.     | PDF import and page preview                   |
| 1:00-2:30   | Draw a region around the state map and extract it.                                    | Avandar turns a selected region into reviewable rows.                   | PDF region selection and extraction           |
| 2:30-3:45   | Review the extracted rows. Correct the fused North Kordofan label if it appears.      | Human review is part of the provenance, not a hidden cleanup step.      | Extraction review grid and validation flags   |
| 3:45-4:30   | Mark West Darfur and Central Darfur as `not_reported`, not zero.                      | The blank becomes information about the surveillance system.            | Editable data review or prepared fallback CSV |
| 4:30-5:30   | Add the IOM 25 June displacement workbook and prepared Admin 1 boundary CSV.          | Outbreak burden is placed inside the conflict and displacement context. | Excel and CSV import                          |
| 5:30-7:15   | Join state names to the boundary data and inspect the match report. Filter Abyei PCA. | The map proves which records matched and which did not.                 | Boundary join, filters, match diagnostics     |
| 7:15-8:45   | Style recorded deaths as a choropleth. Give `not_reported` a separate explicit style. | High burden and unknown burden are visible without conflation.          | Graduated symbology and no-data rendering     |
| 8:45-10:00  | Add two short annotations: "recorded burden" and "surveillance gap".                  | The analysis becomes an operational recommendation.                     | GIS annotations                               |
| 10:00-11:30 | Export the map to PDF and close on the two action lists.                              | A static report became a transparent, shareable response artifact.      | GIS PDF export                                |

### State-level death values in the 3 July map

Use these values to validate the extraction or prepare the fallback file:

| State          | Deaths | Reporting status |
| -------------- | -----: | ---------------- |
| Red Sea        |     25 | Reported         |
| Northern       |     29 | Reported         |
| River Nile     |     83 | Reported         |
| North Darfur   |      1 | Reported         |
| Kassala        |    200 | Reported         |
| Khartoum       |    408 | Reported         |
| Gedaref        |    225 | Reported         |
| Aj Jazirah     |    238 | Reported         |
| North Kordofan |    224 | Reported         |
| West Kordofan  |      1 | Reported         |
| Sennar         |    202 | Reported         |
| White Nile     |    432 | Reported         |
| East Darfur    |     15 | Reported         |
| South Kordofan |     11 | Reported         |
| Blue Nile      |      6 | Reported         |
| South Darfur   |     24 | Reported         |
| West Darfur    |   null | Not reported     |
| Central Darfur |   null | Not reported     |

The known extraction stress point is the North Kordofan label near Khartoum.
Correcting it live is useful if the correction takes less than 20 seconds. If
the extraction fails more broadly, import the prepared CSV and continue. The
story is about transparent review and the meaning of missingness, not OCR.

### Closing line

> The most urgent states are not one ranked list. White Nile and Khartoum stand
> out for recorded deaths. West Darfur and Central Darfur stand out because the
> 3 July map does not tell us enough. The response needs both supplies and
> surveillance capacity, and the exported map makes that distinction explicit.

### Built-feature boundary

This path uses features already present on `develop` through the PDF, filters,
GIS, and NUX merges: PDF region selection, review, CSV and Excel import,
filters, boundary joins, choropleth styling, annotations, and GIS PDF export.
A live SQL join through QETL requires the QETL integration described in the
integration reference. Without it, use the prepared joined CSV and retain the
same narrative.

## Path 2: Pre-position before the rains

**Persona:** Samira Osman, a fictional WASH coordinator deciding where to
pre-position supplies before access and rainfall make response slower.

**Question:** Which states combine recorded cholera burden, major displacement,
and recent rainfall exposure strongly enough to justify an operational
watchlist?

**Arc:** Three datasets that speak different operational languages are reduced
to one transparent watchlist. The turn is the distinction between a planning
signal and a causal claim.

**Shareable deliverables:** A state watchlist CSV and a map PDF with source
dates and a prominent "planning signal, not causal attribution" note.

**Win:** Samira can defend why a state was placed on the watchlist and can show
the exact source column behind every criterion.

### Live run of show

| Time        | Action                                                                                                      | Story beat                                                               | Feature shown                              |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| 0:00-1:00   | Introduce Samira and the pre-positioning question.                                                          | The team needs a short operational list, not another dashboard.          | Narrative setup                            |
| 1:00-2:15   | Open the pre-registered WFP rainfall entry and add it to the workspace.                                     | A live HDX resource becomes a queryable local relation.                  | Open Data catalog and CKAN/HDX acquisition |
| 2:15-3:15   | Add the IOM displacement workbook and state-deaths CSV.                                                     | The analysis combines environment, mobility, and recorded health burden. | Excel and CSV import                       |
| 3:15-6:15   | Filter rainfall to the 2025 period before 3 July, aggregate by state, and join the three sources.           | The criteria are inspectable rather than hidden in a score.              | QETL query, column projection, filters     |
| 6:15-8:15   | Create boolean watchlist columns for high recorded deaths, high displacement, and elevated recent rainfall. | Each reason remains visible.                                             | Query result table                         |
| 8:15-10:00  | Map the watchlist and inspect two states.                                                                   | The map carries the reasoning, not just a color.                         | GIS boundary join and feature table        |
| 10:00-11:30 | Export the shortlist and map. State the causal limitation.                                                  | A repeatable prioritization artifact is ready to share.                  | CSV and GIS PDF export                     |

### Closing line

> This map does not say rainfall or displacement caused cholera in a state. It
> says these are places where recorded burden and operational stressors overlap,
> so pre-positioning and verification have a transparent basis.

### Built-feature boundary

This path requires `feat/qetl-impl` at `78be8860d`. The tip includes the
API-backed Open Data/CKAN acquisition, query mediator, rehearsal fix, and column
projection work. The rainfall resource must be pre-registered. Arbitrary HDX
search, a generic URL importer, and causal modeling are not part of this path.

## Path 3: Naming is part of surveillance

**Persona:** Dr. Amal Hassan, a fictional epidemiologist reconciling current
cholera reporting with inconsistent state names and different reporting
statuses.

**Question:** Can a response team make missingness and naming decisions
explicit enough that a query does not silently turn a surveillance gap into a
zero?

**Arc:** The demo starts with a historical communication problem: cholera-like
outbreaks were often communicated as acute watery diarrhea. It then shows the
same issue at data level, where state aliases and blanks can silently change an
answer. A concept-backed state register turns those assumptions into visible
data.

**Shareable deliverables:** A Sudan state surveillance register and a map with
three explicit statuses: reported, explicitly zero, and not reported.

**Win:** All 18 states remain in the result, including states absent from the
3 July values. A reviewer can inspect the aliases and reporting status instead
of trusting a silent inner join.

### Live run of show

| Time        | Action                                                                                     | Story beat                                                 | Feature shown                              |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| 0:00-1:15   | Introduce Dr. Amal and the AWD/cholera classification context.                             | Naming is part of the surveillance system.                 | Narrative setup                            |
| 1:15-2:45   | Open the prepared Sudan State concept and show its 18 individuals.                         | The analysis starts from the expected reporting universe.  | Concept relation and generated individuals |
| 2:45-4:00   | Show aliases such as Gedaref variants and Aj Jazirah variants.                             | Name reconciliation is explicit and reusable.              | Concept attributes and mappings            |
| 4:00-6:45   | Query the concept relation with the cholera and displacement datasets.                     | A concept alias can participate in a normal QETL query.    | Concept `c0` alias rewriting and QETL join |
| 6:45-8:15   | Compute `reported`, `explicit_zero`, and `not_reported` without dropping unmatched states. | Absence is preserved as a status.                          | SQL result and table inspection            |
| 8:15-10:15  | Map the three statuses and inspect West Darfur and Central Darfur.                         | The surveillance gap becomes operationally visible.        | GIS join and explicit no-data style        |
| 10:15-11:30 | Save the state register and export the map.                                                | The classification logic is now a reusable response asset. | Saved dataset and GIS PDF export           |

### Closing line

> A blank is not a zero, and a familiar label is not automatically a clean
> match. By modeling the expected states, their aliases, and their reporting
> status, the response can communicate both what it knows and what it does not.

### Built-feature boundary

This path requires the QETL tip. The relevant concept relation, generated
individuals, `CREATE TABLE AS SELECT` rehearsal fix, chat concept aliases, and
column projection are already contained in `feat/qetl-impl`. No separate
cherry-pick of the rehearsal, alias, or projection branch is needed after the
QETL tip is integrated. The concept and state mappings should be prepared
before the live demo.

## Selection rule

Rehearse in this order: Path 1, Path 2, Path 3. Use a simple pass sheet with one
row per timed action.

- A path is successful only if every live action reaches its stated output in
  12 minutes or less from a fresh workspace.
- If more than one path succeeds completely, choose Path 1. It uses the source
  PDF most visibly, handles the professor's nuance directly, and produces the
  strongest before-and-after transformation.
- If Path 1 fails only at PDF extraction, use its prepared CSV fallback. Record
  this as a fallback success, not a full extraction success.
- If no path succeeds completely, choose the path with the fewest failed live
  actions. Prefer a failure that can be replaced by a prepared input over a
  failure in query, map, or export.
- Never spend more than five minutes repairing one path before attempting the
  next path.

## Data sources

### Supplied reports

- Sudan Cholera Operational Update, 3 July 2025, supplied locally and also
  represented by the committed OCHA PDF gate fixture.
- International Medical Corps, Sudan Cholera Response Situation Report 1,
  supplied locally. Its known file hash matches the committed geometry gate
  fixture.
- _Enhancing Disease Surveillance in Conflict Settings_, supplied locally for
  context on surveillance constraints.

### Open data

- [Sudan administrative boundaries, HDX](https://data.humdata.org/dataset/cod-ab-sdn)
  - GeoJSON resource id: `018af991-4aa7-4043-a0d5-e429a55851fb`
- [Sudan displacement situation, IOM DTM on HDX](https://data.humdata.org/dataset/sudan-displacement-situation-countrywide-idps-iom-dtm)
  - 25 June 2025 workbook:
    `https://data.humdata.org/dataset/44594ae2-dde9-417f-acae-523bc012c162/resource/fa36e2cf-ef9a-4891-9645-7aadd28c09d8/download/dtm_sdn_smu-bi-weekly-19_-25062025_v02_public_hdx.xlsx`
  - The 25 June snapshot reports 10,065,329 internally displaced people. The
    five Darfur states account for 5,758,903 in that source.
- [Sudan subnational rainfall, WFP on HDX](https://data.humdata.org/dataset/sdn-rainfall-subnational)
  - Five-year-to-date CSV resource id:
    `9359abcf-d1fc-41dd-b2a5-f27278e87bd7`
  - Download URL:
    `https://data.humdata.org/dataset/139b7e9c-3c40-49e0-a44e-0eed6dad46d2/resource/9359abcf-d1fc-41dd-b2a5-f27278e87bd7/download/sdn-rainfall-subnat-5ytd.csv`
  - Use this approximately 3.7 MB resource. The full historical resource is
    larger than the current 25 MB acquisition cap.

## Claims to avoid

- Do not say that West Darfur or Central Darfur had zero deaths.
- Do not infer incidence from death counts without a denominator.
- Do not call the watchlist a predictive model.
- Do not claim rainfall or displacement caused the observed distribution.
- Do not imply that a single situation report is a complete surveillance
  system.
- Do not present the fictional persona as a real person.
- Do not imply that Avandar can browse arbitrary HDX resources live.
