# Gate document fixtures

The two situation reports that `src/workers/pdfSniff/gateDocuments.test.ts`
reads. That test is the branch's merge condition: it asserts specific figures
out of specific regions of these two documents, so the documents themselves
have to be pinned as carefully as the expected values are.

These are **not** interchangeable with the fixtures in
`public/test-data/pdf/README.md`. Those three are open-access journal articles
chosen to exercise table detection. These two are humanitarian situation
reports chosen because their data is _not_ in tables: it is in a choropleth
map, in KPI tiles, in a bar chart, in numbered prose blocks and in running
sentences. They are the reason the four region shapes exist.

Both were retrieved on **2026-08-18**.

## `ocha-sudan-cholera-update-2025-07-03.pdf` — committed

> United Nations Office for the Coordination of Humanitarian Affairs (2025).
> _Sudan: Cholera Operational Update, 3 July 2025._ OCHA Sudan.
> https://www.unocha.org/attachments/6cb6c2a8-aa23-4661-9f6f-80d9adda095c/Sudan_Cholera_Operational_Update_3%20July%202025.pdf

- SHA-256 `1316f4169571a721887d2ea281c84a158def22f374716f244a006dfd41ee173e`
- 3 pages, A4, Adobe InDesign 20.3, untagged.

**Licence position.** OCHA publishes its situation reports and operational
updates for reuse with attribution, in line with UN OCHA's standing practice
for humanitarian information products, and the document carries no notice
restricting redistribution. On that basis the PDF is committed here, with the
attribution above satisfying the condition.

## `imc-sudan-cholera-sitrep-1.pdf` — fetched, not committed

> International Medical Corps (2025). _Sudan Cholera Response, Situation
> Report #1, June 24, 2025._ Hosted on ReliefWeb.
> https://reliefweb.int/attachments/b111a07c-e9f8-4061-8589-569bab57fae7/IntlMedCorps-SudanCholeraResponse_SitRep1.pdf

- SHA-256 `9a15e32eb738d8b1a7b34eabd0abebb039adb49bfdad8e083e44e72413b98721`
- 2 pages, US Letter, Microsoft Word via Acrobat, untagged.

**Why this one is fetched rather than committed.** We have not confirmed any
licence permitting redistribution. International Medical Corps publishes no
blanket reuse terms for its situation reports, and ReliefWeb is a host rather
than a rights holder: its terms cover the ReliefWeb site, not the documents
partners post to it. Redistributing the file inside a commercial product on
that basis would be a guess, and the rule in `public/test-data/pdf/README.md`
is that a fixture is only committed when its licence permits redistribution.

So the PDF is in `.gitignore` and `scripts/fetch-gate-fixtures.mjs` downloads
it on demand, verifying a SHA-256 so that a document changed at the source
cannot quietly change what the merge gate asserts:

```bash
pnpm fetch-gate-fixtures
```

If someone confirms reuse terms with International Medical Corps, commit the
PDF, record the terms here, and delete its entry from the fetch script.

## `imc-sudan-cholera-sitrep-1.geometry.json` — committed

Extracting the page geometry from a PDF is not redistributing the PDF, so the
geometry of page 1 is committed. This is what lets the IMC extraction
assertions run offline, in CI, and on a checkout where nobody has run
`pnpm fetch-gate-fixtures`.

It holds the `PageGeometry` for page 1 and the document's pdf.js `info`
record, plus the SHA-256 of the PDF it was read from. The gate test asserts
that this file still matches the PDF whenever the PDF is present, so it cannot
drift into asserting something the document no longer says.

Regenerate it after changing `extractPageGeometry`:

```bash
pnpm fetch-gate-fixtures
UPDATE_GATE_GEOMETRY=1 pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts
```
