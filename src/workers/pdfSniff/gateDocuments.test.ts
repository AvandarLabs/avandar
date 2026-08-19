import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { classifyRegion } from "./classifyRegion";
import { clipToRegion } from "./clipToRegion";
import { combineRegions } from "./combineRegions";
import { extractDocumentMetadata } from "./extractDocumentMetadata";
import { extractLabelledGraphic } from "./extractors/extractLabelledGraphic";
import { extractProseMeasures } from "./extractors/extractProseMeasures";
import { extractRepeatingBlocks } from "./extractors/extractRepeatingBlocks";
import { extractPageGeometry } from "./extractPageGeometry";
import { loadPdfDocument } from "./loadPdfJs";
import type { BBox, ExtractedTable, PageGeometry } from "./types";

/*
 * The executable merge gate.
 *
 * This file is the definition of done for PDF region extraction. It reads two
 * real humanitarian situation reports and asserts specific figures out of
 * specific regions, so that "the extractors work" is a claim someone can run
 * rather than a claim someone made.
 *
 * Two rules govern edits here.
 *
 * 1. Move the region box, never the expected value. Every number below was
 *    read off the printed document by hand. If an assertion fails, the box or
 *    the extractor is wrong, not the document.
 * 2. Where an extractor cannot reach a figure, the gate says so out loud in a
 *    KNOWN DEFECT comment and pins the behaviour we actually get. It never
 *    quietly asks for less. A gate that passes because it was weakened is
 *    worse than one that fails, because this is the merge condition and
 *    someone will trust it.
 *
 * Coordinates are pdf.js user space: `[x0, y0, x1, y1]` from the page's
 * BOTTOM-left, which is what `clipToRegion` consumes. The design notes
 * recorded these boxes measured from the TOP-left, so every y below is the
 * design value subtracted from the page height, then tightened against the
 * real geometry.
 */

const GATE_DIR = "public/test-data/pdf/gate";
const OCHA = `${GATE_DIR}/ocha-sudan-cholera-update-2025-07-03.pdf`;
const IMC = `${GATE_DIR}/imc-sudan-cholera-sitrep-1.pdf`;
const IMC_GEOMETRY = `${GATE_DIR}/imc-sudan-cholera-sitrep-1.geometry.json`;

/**
 * The IMC page-1 geometry, committed so that the extraction assertions below
 * run on a checkout where the PDF itself is absent.
 *
 * `rules[].span` is a two-element tuple that JSON gives back as an array, so
 * this is a structural assertion about the file rather than a parse.
 */
type CommittedGeometry = {
  sourcePdfSha256: string;
  info: Record<string, unknown>;
  page1: PageGeometry;
};

const IMC_PDF_PRESENT = existsSync(IMC);

const IMC_SKIP_MESSAGE =
  "The IMC situation report PDF is not in the working tree, so the gate " +
  "assertions that read it from the PDF are SKIPPED. Run " +
  "`pnpm fetch-gate-fixtures` to download it. This is expected on a fresh " +
  "checkout: the document has no confirmed redistribution licence, so it is " +
  "gitignored (see public/test-data/pdf/gate/README.md). The IMC extraction " +
  "assertions still ran, against the committed page geometry, but nothing " +
  "has proved that geometry still matches the real document.";

if (!IMC_PDF_PRESENT) {
  console.warn(`\n[merge gate] ${IMC_SKIP_MESSAGE}\n`);
}

async function pageOf(path: string, pageNumber: number): Promise<PageGeometry> {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry(page, pageNumber - 1);
  await doc.destroy();
  return geometry;
}

async function infoOf(path: string): Promise<Record<string, unknown>> {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const { info } = await doc.getMetadata();
  await doc.destroy();
  return info as Record<string, unknown>;
}

async function committedImcGeometry(): Promise<CommittedGeometry> {
  return JSON.parse(await readFile(IMC_GEOMETRY, "utf8")) as CommittedGeometry;
}

/**
 * Rewrites font names to `font-0`, `font-1`, ... in order of first
 * appearance.
 *
 * pdf.js mints font ids per loaded document within a process, so the same file
 * yields `g_d1_f1` when it is the first document loaded and `g_d13_f1` when it
 * is the thirteenth. That makes the raw name useless both as committed data
 * and as an assertion. The only thing any caller asks of it is whether two
 * items share a font (`assembleWords` splits a word at a font change), and
 * this preserves exactly that while being identical on every run.
 */
function canonicalFonts(page: PageGeometry): PageGeometry {
  const names = new Map<string, string>();
  return {
    ...page,
    textItems: page.textItems.map((item) => {
      const existing = names.get(item.fontName);
      const name = existing ?? `font-${names.size}`;
      names.set(item.fontName, name);
      return { ...item, fontName: name };
    }),
  };
}

/** The rows an extractor produced, with its header row removed. */
function dataRows(table: ExtractedTable): ReadonlyArray<readonly string[]> {
  return table.cells.slice(table.headerRows);
}

/** Data rows indexed by their first column, for order-independent checks. */
function byLabel(table: ExtractedTable): Record<string, string> {
  return Object.fromEntries(
    dataRows(table).map((row) => {
      return [row[0] ?? "", row[1] ?? ""];
    }),
  );
}

/** The distinct data rows any flag points at. A region flag is not a row. */
function flaggedRowIndices(table: ExtractedTable): ReadonlySet<number> {
  return new Set(
    table.flags
      .filter((flag) => {
        return flag.rowIndex >= 0;
      })
      .map((flag) => {
        return flag.rowIndex;
      }),
  );
}

/*
 * Regenerating the committed IMC geometry, after a change to
 * `extractPageGeometry` moves what it records:
 *
 *   pnpm fetch-gate-fixtures
 *   UPDATE_GATE_GEOMETRY=1 pnpm vitest run \
 *     src/workers/pdfSniff/gateDocuments.test.ts
 *
 * This runs before the suite rather than inside a test so that the offline
 * assertions read the file it just wrote.
 */
if (process.env["UPDATE_GATE_GEOMETRY"] !== undefined && IMC_PDF_PRESENT) {
  const { createHash } = await import("node:crypto");
  const regenerated: CommittedGeometry = {
    sourcePdfSha256: createHash("sha256")
      .update(await readFile(IMC))
      .digest("hex"),
    info: await infoOf(IMC),
    page1: canonicalFonts(await pageOf(IMC, 1)),
  };
  await writeFile(IMC_GEOMETRY, `${JSON.stringify(regenerated, null, 2)}\n`);
  console.warn(`[merge gate] rewrote ${IMC_GEOMETRY}`);
}

/*
 * ---------------------------------------------------------------------------
 * OCHA Sudan Cholera Operational Update, 3 July 2025
 * ---------------------------------------------------------------------------
 */

/**
 * The choropleth panel on page 1, excluding both the legend below it and the
 * "Cholera cases/deaths by state" title above it.
 *
 * Keeping the legend out is not cosmetic. During design a box that reached
 * down to the legend read its bin boundaries (10, 500, 1,000, 5,000...) as
 * state data, because a bin boundary is a bare number exactly like a death
 * count is. The bins sit at y 372, so the box floor of 450 clears them with
 * room to spare, and also clears the "Abyei PCA" annotation at y 443 that
 * belongs to no state.
 */
const OCHA_MAP: BBox = [305, 450, 570, 615];

/** The three KPI tiles on page 1: cases, deaths, case fatality rate. */
const OCHA_TILES: BBox = [330, 272, 580, 325];

/** The funding-by-pillar bar chart on page 3. */
const OCHA_BARS: BBox = [300, 300, 570, 440];

/** The weekly cholera cases trend chart at the foot of page 1. */
const OCHA_TREND: BBox = [30, 55, 570, 215];

/*
 * The six response pillars are laid out as two magazine columns per page, and
 * a region has to be one column wide. A full-page box interleaves the two
 * columns: their baselines land within `groupLines`' 3-point tolerance, so
 * "Responses: To strengthen outbreak surveillance" and "Challenges: Gaps
 * remain in outreach coverage" fuse into a single line and the blocks come out
 * with each other's fields. Measured on page 2, a full-page box yields 4
 * blocks with scrambled headings instead of 5 correct ones.
 */
const OCHA_PILLARS_PAGE2_LEFT: BBox = [30, 40, 295, 790];
const OCHA_PILLARS_PAGE2_RIGHT: BBox = [298, 40, 570, 790];
const OCHA_PILLARS_PAGE3_LEFT: BBox = [30, 690, 295, 800];

/**
 * Every cumulative death count printed on the choropleth, read off the map by
 * hand. This is the "zero silently wrong" assertion: the extractor's output
 * must equal this exactly, not merely contain it.
 *
 * 16 of Sudan's 18 states carry a figure, matching the document's own
 * "affecting 16 out of 18 states". West Darfur and Central Darfur are shaded
 * but unlabelled, and are asserted separately as rows with no value.
 *
 * KNOWN DEFECT, pinned deliberately: North Kordofan's key is
 * "NORTH KORDOFAN Khartoum", not "NORTH KORDOFAN". `assembleLabels` merges
 * two items on one baseline when their edge gap is 8 points or less, and the
 * "Khartoum" capital-city annotation sits 6.8 points to the right of the
 * "NORTH KORDOFAN" state label. The VALUE is right; only the label is
 * polluted.
 *
 * Requiring a matching `fontName` for a same-line merge was tried and backed
 * out. The premise holds: the two items really are set in different faces
 * (4pt small caps `g_d0_f5` against the 5pt city face `g_d0_f8`). But
 * unfusing them releases "Khartoum" as a label in its own right, and it then
 * WINS the 408 figure from the state label on distance alone: 15.9 points to
 * the city annotation against 20.5 to "KHARTOUM", a ratio of 0.78 that falls
 * just under the flagging threshold. The measured result was 19 rows with
 * "Khartoum" holding 408, "KHARTOUM" empty, and 7 flagged rows, so it traded
 * one wrong label for another and broke the flag budget. The map's 16
 * pairings survive only with the fusion left in place.
 *
 * The real fix is for pairing to know that a point annotation and an area
 * label are different kinds of thing, which is a change to shape 2's
 * association rule rather than to label assembly.
 */
const OCHA_MAP_DEATHS: Readonly<Record<string, string>> = {
  "RED SEA": "25",
  NORTHERN: "29",
  "RIVER NILE": "83",
  "NORTH DARFUR": "1",
  KASSALA: "200",
  KHARTOUM: "408",
  GEDAREF: "225",
  "AJ JAZIRAH": "238",
  "NORTH KORDOFAN Khartoum": "224",
  "WEST KORDOFAN": "1",
  SENNAR: "202",
  "WHITE NILE": "432",
  "EAST DARFUR": "15",
  "SOUTH KORDOFAN": "11",
  "BLUE NILE": "6",
  "SOUTH DARFUR": "24",
};

describe("gate document: OCHA Sudan Cholera Operational Update", () => {
  it("reads 16 state death counts from the map", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const rows = dataRows(table);

    const withValue = rows.filter((row) => {
      return row[1] !== "";
    });
    expect(withValue).toHaveLength(16);

    // The extractor also emits one empty row per label it found no figure
    // for, which is the honest report for the two unlabelled states. Both are
    // asserted so that a future change cannot drop them and still look right.
    const withoutValue = rows.filter((row) => {
      return row[1] === "";
    });
    expect(
      withoutValue.map((row) => {
        return row[0];
      }),
    ).toEqual(["WEST DARFUR", "CENTRAL DARFUR"]);
    expect(rows).toHaveLength(18);
  });

  it("pairs every map figure with the right state, and none wrongly", async () => {
    // Exact equality, not containment. A near-tie on a choropleth resolves
    // silently, so the only assertion worth making is that all 16 landed on
    // the state they are printed inside.
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const valued = Object.fromEntries(
      Object.entries(byLabel(table)).filter(([, value]) => {
        return value !== "";
      }),
    );

    expect(valued).toEqual(OCHA_MAP_DEATHS);
  });

  it("reads the headline state figures exactly", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const labels = byLabel(table);

    expect(labels["KHARTOUM"]).toBe("408");
    expect(labels["WHITE NILE"]).toBe("432");
    expect(labels["AJ JAZIRAH"]).toBe("238");
    expect(labels["GEDAREF"]).toBe("225");
  });

  it("flags no more than 6 map rows for review", async () => {
    // The design measurement flagged 5 of 16. Allowing 6 leaves room for
    // tuning without letting the flag rate quietly become meaningless.
    // Currently 6: four near-tie pairings (Sennar, White Nile, East Darfur,
    // River Nile) plus the two states with no figure.
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });

    expect(flaggedRowIndices(table).size).toBeLessThanOrEqual(6);
  });

  it("reads the three KPI tiles", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_TILES);
    const table = extractLabelledGraphic(region, { regionId: "tiles" });

    expect(dataRows(table)).toHaveLength(3);
    expect(byLabel(table)).toEqual({
      "CASES SINCE JULY 2024": "83000",
      DEATHS: "2100",
      "CASE FATALITY RATE (CFR)": "2.6",
    });
    // Nothing here is a near-tie: three tiles, well separated.
    expect(table.flags).toHaveLength(0);
  });

  it("does NOT read the funding-by-pillar bars as pillar amounts", async () => {
    // KNOWN GAP, asserted rather than hidden. This is the `unit` gap the plan
    // already records, showing up as a pairing failure.
    //
    // `extractLabelledGraphic` has no notion of a unit: it treats a bare
    // numeral as a value and every other item as a label. Each bar's amount
    // is printed as three items ("3", "M", "(15%)"), so the magnitude suffix
    // and the share become a label, "M (15%)", sitting 13 points from the
    // figure while the pillar name it belongs to is 172 points away. Every
    // figure therefore pairs with its own unit, and the six pillar names come
    // out as rows with no value.
    //
    // That output is incomplete but not a lie: no row claims a pillar was
    // funded at some amount. The tempting "fix" is to drop the annotations so
    // the count comes out at 6, which would report WASH at 3 where the
    // document says $3 million: a count that passes over a value wrong by a
    // factor of a million. The real fix is unit-aware value assembly, the
    // same gap that leaves `unit` unpopulated elsewhere. Until then this pins
    // the behaviour so a fix has to come back here and update it.
    const region = clipToRegion(await pageOf(OCHA, 3), OCHA_BARS);
    const table = extractLabelledGraphic(region, { regionId: "bars" });
    const labels = byLabel(table);
    const pillars = [
      "WASH",
      "Health",
      "RCCE",
      "Log and Supply",
      "Coordination",
      "Others",
    ];

    // All six pillars are found, and every one of them reports no figure.
    for (const pillar of pillars) {
      expect(labels[pillar]).toBe("");
    }
    expect(table.flags).toHaveLength(6);
    for (const flag of table.flags) {
      expect(flag.reason).toBe("unmatched_label");
    }

    // The six figures are present, attached to their own units. Asserted so
    // that the day the extractor learns to read them, this fails loudly.
    expect(labels["M (15%)"]).toBe("3");
    expect(labels["M (13%)"]).toBe("2");
    expect(dataRows(table)).toHaveLength(12);
  });

  it("reads all six response pillars, one column region at a time", async () => {
    const page2 = await pageOf(OCHA, 2);
    const page3 = await pageOf(OCHA, 3);
    const left = extractRepeatingBlocks(
      clipToRegion(page2, OCHA_PILLARS_PAGE2_LEFT),
      { regionId: "pillars-2l" },
    );
    const right = extractRepeatingBlocks(
      clipToRegion(page2, OCHA_PILLARS_PAGE2_RIGHT),
      { regionId: "pillars-2r" },
    );
    const sixth = extractRepeatingBlocks(
      clipToRegion(page3, OCHA_PILLARS_PAGE3_LEFT),
      { regionId: "pillars-3l" },
    );

    // Pillars 1 to 5 are whole, and their two regions share a header, so
    // `combineRegions` unions them into one natural-mode table rather than
    // falling back to observations.
    const combined = combineRegions({
      tables: [left, right],
      regionLabels: {},
      documentMetadata: {
        title: null,
        organisation: null,
        reportNumber: null,
        publishedAt: null,
      },
    });

    expect(combined.outputMode).toBe("natural");
    expect(combined.cells[0]).toEqual([
      "number",
      "heading",
      "Responses",
      "Challenges",
      "Priorities",
    ]);
    expect(
      combined.cells.slice(1).map((row) => {
        return row[0];
      }),
    ).toEqual(["1", "2", "3", "4", "5"]);
    expect(combined.cells[1]?.[1]).toBe(
      "Surveillance, early detection and case management",
    );
    // Every field of every whole pillar is populated: no shifted columns.
    for (const row of combined.cells.slice(1)) {
      expect(row).toHaveLength(5);
      for (const cell of row) {
        expect(cell.length).toBeGreaterThan(0);
      }
    }
    expect(left.flags).toHaveLength(0);
    expect(right.flags).toHaveLength(0);

    // KNOWN GAP, asserted rather than hidden. Pillar 6 straddles page 3's
    // column gutter: its heading and Responses are in the left column, its
    // Challenges and Priorities in the right, and the right column carries no
    // heading of its own. A rectangular region cannot hold one without the
    // other's baselines, so the sixth pillar comes back with one field. This
    // needs the region model to carry a reading order across fragments, which
    // is a data-model change, so it is recorded here rather than papered over.
    expect(dataRows(sixth)).toHaveLength(1);
    expect(sixth.cells[0]).toEqual(["number", "heading", "Responses"]);
    expect(sixth.cells[1]?.[0]).toBe("6");
    expect(sixth.cells[1]?.[1]).toBe("Coordination and strategic planning");
  });

  it("reads the document's identity", async () => {
    const meta = extractDocumentMetadata({
      page: await pageOf(OCHA, 1),
      info: await infoOf(OCHA),
    });

    expect(meta.publishedAt).toBe("2025-07-03");
    expect(meta.title).toMatch(/cholera/iu);
  });

  it("does NOT extract the weekly trend chart", async () => {
    // Shape 4 is deferred. Asserting its absence keeps that a decision rather
    // than something that quietly half-works: the chart has axis ticks and
    // week numbers but no data labels, so any weekly figure here would be an
    // interpolated guess at a bar's height.
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_TREND);
    const table = extractLabelledGraphic(region, { regionId: "trend" });
    const rows = dataRows(table);

    // Everything the chart prints as scaffolding: the y-axis ticks and the
    // 26 week ordinals. Nothing else is text on this chart.
    const scaffolding = new Set([
      "0",
      "2000",
      "4000",
      "6000",
      "8000",
      "10000",
      ...Array.from({ length: 26 }, (_unused, index) => {
        return String(index + 1);
      }),
    ]);

    // Not one emitted value is a reading of the series: every one is a tick
    // label or a week number that the extractor happened to pair with a month
    // name. Nothing between the ticks is ever invented.
    for (const row of rows) {
      expect(scaffolding.has(row[1] ?? "")).toBe(true);
    }
    // 26 weekly bars, and at most a handful of junk rows: no series comes out.
    expect(rows.length).toBeLessThan(10);
    // And the extractor says so, loudly, at region level.
    const unmatched = table.flags.filter((flag) => {
      return flag.reason === "unmatched_value";
    });
    expect(unmatched.length).toBeGreaterThanOrEqual(20);

    // KNOWN DEFECT, pinned deliberately: `classifyRegion` calls this a grid
    // table with high confidence, because a chart's bars and gridlines reach
    // `extractPageGeometry` as horizontal rules and two rules plus two lines
    // is its strongest signal. The same is true of the choropleth. The UI's
    // shape override (Task 16) is what saves the user today; a rule that
    // ignores rules shorter than the region is the real fix.
    expect(classifyRegion(region).shape).toBe("grid_table");
  });
});

/*
 * ---------------------------------------------------------------------------
 * International Medical Corps Sudan Cholera Situation Report #1
 * ---------------------------------------------------------------------------
 */

/**
 * The situation-update prose in page 1's left column.
 *
 * The floor sits above the photo caption at y 433, which reads "conducts a
 * one on-one hygiene promotion session" and yields a spurious measurement of
 * 1 "on-one hygiene promotion" if it is included.
 */
const IMC_PROSE: BBox = [30, 248, 385, 422];

/**
 * The full-width "International Medical Corps Response" section.
 *
 * The floor is 44, not the 60 the design notes recorded: the Ombada Hospital
 * CTC sentence is the last line on the page at y 50, and a floor of 60 cuts
 * off the 237/253/10 figures this region exists to read.
 */
const IMC_RESPONSE: BBox = [30, 44, 580, 220];

describe("gate document: IMC Sudan Cholera SitRep #1 (committed geometry)", () => {
  it("reads the June case and death figures", async () => {
    const { page1 } = await committedImcGeometry();
    const region = clipToRegion(page1, IMC_PROSE);
    const table = extractProseMeasures(region, { regionId: "prose" });
    const flat = JSON.stringify(table.cells);

    expect(flat).toContain("21563");
    expect(flat).toContain("388");
  });

  it("reads the spelled-out number with a trailing-clause subject", async () => {
    // "and one death in West Darfur" is the specific construction that
    // defeats a digits-only extractor, and it is why this document is a gate.
    const { page1 } = await committedImcGeometry();
    const region = clipToRegion(page1, IMC_PROSE);
    const table = extractProseMeasures(region, { regionId: "prose" });

    expect(
      dataRows(table).some((row) => {
        return row[0] === "West Darfur" && row[1] === "death" && row[2] === "1";
      }),
    ).toBe(true);
  });

  it("reads the South Darfur figures with their subject", async () => {
    // One sentence names two provinces: "...and one death in West Darfur, and
    // 166 cases and 13 deaths reported in South Darfur." Each figure has to
    // land on the province its own clause names, which is why
    // `extractMeasurements` resolves a subject per comma fragment rather than
    // per sentence.
    const { page1 } = await committedImcGeometry();
    const region = clipToRegion(page1, IMC_PROSE);
    const table = extractProseMeasures(region, { regionId: "prose" });
    const subjectOf = (value: string) => {
      return dataRows(table).find((row) => {
        return row[2] === value;
      })?.[0];
    };

    expect(
      dataRows(table).filter((row) => {
        return row[0] === "South Darfur";
      }),
    ).toHaveLength(2);
    expect(subjectOf("166")).toBe("South Darfur");
    expect(subjectOf("13")).toBe("West Darfur");
    expect(subjectOf("5")).toBe("West Darfur");

    // The June totals belong to no province the sentence names, and with two
    // clauses on offer there is nothing to borrow. Unattributed is the honest
    // answer; a guess here is what put South Darfur's dead in West Darfur.
    expect(subjectOf("21563")).toBe("");
    expect(subjectOf("388")).toBe("");
  });

  it("reads the Ombada Hospital CTC figures", async () => {
    const { page1 } = await committedImcGeometry();
    const region = clipToRegion(page1, IMC_RESPONSE);
    const table = extractProseMeasures(region, { regionId: "response" });
    const admitted = dataRows(table).find((row) => {
      return row[1] === "patients";
    });
    const discharged = dataRows(table).find((row) => {
      return row[1] === "discharged";
    });

    expect(admitted?.[2]).toBe("237");
    expect(discharged?.[2]).toBe("253");
  });

  it("reads the report number and date", async () => {
    const { page1, info } = await committedImcGeometry();
    const meta = extractDocumentMetadata({ page: page1, info });

    expect(meta.reportNumber).toBe("1");
    expect(meta.publishedAt).toBe("2025-06-24");
  });
});

describe.skipIf(!IMC_PDF_PRESENT)(
  "gate document: IMC Sudan Cholera SitRep #1 (from the PDF)",
  () => {
    it("still matches the committed geometry the assertions above read", async () => {
      // Without this, the offline block is testing a snapshot that could have
      // drifted from the document it claims to describe. With it, the two
      // together are as strong as reading the PDF in every test.
      const { page1, info, sourcePdfSha256 } = await committedImcGeometry();
      const { createHash } = await import("node:crypto");

      expect(
        createHash("sha256")
          .update(await readFile(IMC))
          .digest("hex"),
      ).toBe(sourcePdfSha256);
      expect(canonicalFonts(await pageOf(IMC, 1))).toEqual(page1);
      expect(await infoOf(IMC)).toEqual(info);
    });

    it("reads the same figures straight from the PDF", async () => {
      const table = extractProseMeasures(
        clipToRegion(await pageOf(IMC, 1), IMC_PROSE),
        { regionId: "prose" },
      );
      const flat = JSON.stringify(table.cells);

      expect(flat).toContain("21563");
      expect(flat).toContain("388");
      expect(
        dataRows(table).some((row) => {
          return row[0] === "West Darfur" && row[2] === "1";
        }),
      ).toBe(true);
    });
  },
);
