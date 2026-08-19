# PDF Import Phase B3: Automatic Table Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Find tables in a PDF automatically using three independent signals, and offer each one to the user as a pre-drawn region.

**Architecture:** Three detectors read the normalised page geometry Phase B1 produces. The tagged structure tree is ground truth where it exists; ruling lines from the content stream are next; whitespace and alignment clustering is the fallback. Candidates are deduplicated by bounding-box overlap, merged across page spans, and scored, then handed to Phase B2's region picker as regions of shape `grid_table`.

**Tech Stack:** TypeScript, pdfjs-dist, Web Workers, Vitest.

---

## Prerequisites

**Phases B1 and B2 must be complete.** This plan consumes B1's `PageGeometry`,
`groupLines` and `normalizeCellValue`, and it delivers its results into B2's
region picker and review grid. See:

- `2026-08-18-pdf-import-phase-b1-extraction-foundation.md`
- `2026-08-18-pdf-import-phase-b2-selection-extraction.md`

Read `docs/superpowers/specs/2026-08-17-pdf-import-design.md` for the detection
signals, and
`docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md` for how
detected tables became one region source among several.

## Where this phase sits, and what changed

This phase is the original Phase B plan's detection half, unchanged in
substance. Two things about its position changed:

1. **It is no longer the merge gate.** Neither situation report driving v0
   contains a table, so this phase cannot unblock that merge. It ships in the
   branch, after the work that can.
2. **Its output is a region, not a dataset.** A detected table used to be the
   thing the user picked from a list. It is now a pre-drawn region offered
   alongside the ones the user draws, extracted by the same
   `extractGridTable` that B2 already built. That is why there is no separate
   extraction task here: detection proposes geometry, and B2 owns turning
   geometry into rows.

Seven of this plan's ten tasks are lifted unchanged from the original Phase B
plan.

## Background an engineer new to this codebase needs

**Coverage of the tagged path.** `page.getStructTree()` returns real table
structure, but only roughly 10 to 15% of PDFs are tagged. The distribution
favours us (Word and Google Docs exports, modern LaTeX, and
accessibility-mandated government reports are tagged) but the untagged paths
carry most real documents.

**Why lattice detection needs no computer vision.** Camelot rasterises the page
and runs OpenCV morphology to rediscover lines the generator already recorded.
Phase B1's `extractPageGeometry` reads those lines straight out of the content
stream as `RuleSegment`s, which is strictly more accurate and needs no canvas
and no WASM.

**Why stream detection is surfaced as a guess.** Alignment is evidence of a
column, not proof of one. Borderless tables are common enough in agency and NGO
reporting that omitting the signal would gut the feature, but its results
always carry a visible caveat.

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/workers/pdfSniff/detectLatticeTables.ts` | Signal B: ruling lines | 1 |
| `src/workers/pdfSniff/detectTaggedTables.ts` | Signal A: structure tree | 2, 4 |
| `src/workers/pdfSniff/detectStreamTables.ts` | Signal C: whitespace | 3 |
| `src/workers/pdfSniff/dedupeCandidates.ts` | Cross-signal dedup | 5 |
| `src/workers/pdfSniff/mergePageSpans.ts` | Multi-page joining | 6 |
| `src/workers/pdfSniff/scoreCandidate.ts` | Confidence scoring | 7 |
| `src/workers/pdfSniff/candidatesToRegions.ts` | Detections to regions | 8 |

---

## Task 1: Lattice detection from ruling lines

**Files:**
- Create: `src/workers/pdfSniff/detectLatticeTables.ts`
- Create: `src/workers/pdfSniff/detectLatticeTables.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectLatticeTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectLatticeTables } from "./detectLatticeTables";
import type { PageGeometry, RuleSegment, TextItem } from "./types";

function textItem(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function hRule(y: number, x0: number, x1: number): RuleSegment {
  return { orientation: "horizontal", position: y, span: [x0, x1] };
}

function vRule(x: number, y0: number, y1: number): RuleSegment {
  return { orientation: "vertical", position: x, span: [y0, y1] };
}

/**
 * A 2-column, 2-row fully ruled grid spanning x 100-300, y 500-560,
 * with row boundaries at y 560, 530, 500 and column boundaries at x 100,
 * 200, 300.
 */
function fullyRuledPage(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [
      hRule(560, 100, 300),
      hRule(530, 100, 300),
      hRule(500, 100, 300),
      vRule(100, 500, 560),
      vRule(200, 500, 560),
      vRule(300, 500, 560),
    ],
    textItems: [
      textItem("District", 110, 540),
      textItem("Cases", 210, 540),
      textItem("Gao", 110, 510),
      textItem("1204", 210, 510),
    ],
  };
}

describe("detectLatticeTables", () => {
  it("builds a grid from a fully ruled table", () => {
    const [table, ...rest] = detectLatticeTables(fullyRuledPage());

    expect(rest).toHaveLength(0);
    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("lattice");
    expect(table!.gridX).toEqual([100, 200, 300]);
    expect(table!.gridY).toEqual([560, 530, 500]);
    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
    ]);
  });

  it("assigns each text item to the cell containing it", () => {
    const [table] = detectLatticeTables(fullyRuledPage());
    expect(table!.cells[1]![0]).toBe("Gao");
    expect(table!.cells[1]![1]).toBe("1204");
  });

  it("snaps rules that are within tolerance of each other", () => {
    // Generators emit rules at slightly different coordinates for what is
    // visually one line. Without snapping, a 3-column table becomes a
    // 6-column one with empty alternating columns.
    const page = fullyRuledPage();
    const jittered: PageGeometry = {
      ...page,
      rules: [
        hRule(560, 100, 300),
        hRule(560.4, 100, 300),
        hRule(530, 100, 300),
        hRule(500, 100, 300),
        vRule(100, 500, 560),
        vRule(200, 500, 560),
        vRule(200.3, 500, 560),
        vRule(300, 500, 560),
      ],
    };

    const [table] = detectLatticeTables(jittered);

    expect(table!.gridX).toHaveLength(3);
    expect(table!.gridY).toHaveLength(3);
  });

  it("returns nothing when there are too few rules to form a grid", () => {
    const page: PageGeometry = {
      ...fullyRuledPage(),
      rules: [hRule(560, 100, 300)],
    };

    expect(detectLatticeTables(page)).toEqual([]);
  });

  it("finds two separate tables on one page", () => {
    // Two tables side by side is exactly the case that makes naive column
    // detection merge unrelated data. See page 8 of the Frontiers fixture.
    const page: PageGeometry = {
      pageIndex: 0,
      width: 595,
      height: 842,
      looksScanned: false,
      rules: [
        hRule(560, 60, 260),
        hRule(530, 60, 260),
        vRule(60, 530, 560),
        vRule(160, 530, 560),
        vRule(260, 530, 560),
        hRule(560, 330, 530),
        hRule(530, 330, 530),
        vRule(330, 530, 560),
        vRule(430, 530, 560),
        vRule(530, 530, 560),
      ],
      textItems: [
        textItem("Left A", 70, 540),
        textItem("Left B", 170, 540),
        textItem("Right A", 340, 540),
        textItem("Right B", 440, 540),
      ],
    };

    const tables = detectLatticeTables(page);

    expect(tables).toHaveLength(2);
    expect(tables[0]!.cells[0]).toEqual(["Left A", "Left B"]);
    expect(tables[1]!.cells[0]).toEqual(["Right A", "Right B"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectLatticeTables.test.ts`
Expected: FAIL, cannot resolve `./detectLatticeTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectLatticeTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, RuleSegment } from "./types";

/**
 * Rules within this many points of each other are the same line. Generators
 * routinely emit a table's rules at marginally different coordinates;
 * without snapping, a 3-column table is read as 6 columns with empty
 * alternating cells.
 */
const SNAP_TOLERANCE = 2;

/** A grid needs at least two lines each way to enclose one cell. */
const MIN_GRID_LINES = 2;

/**
 * Collapses near-identical positions into one representative value, keeping
 * the mean of each cluster so the grid sits where the ink actually is.
 */
function _snapPositions(positions: readonly number[]): number[] {
  const sorted = [...positions].sort((a, b) => {
    return a - b;
  });
  const snapped: number[] = [];
  let cluster: number[] = [];

  for (const position of sorted) {
    const clusterHead = cluster[0];
    if (clusterHead === undefined || position - clusterHead <= SNAP_TOLERANCE) {
      cluster.push(position);
      continue;
    }
    snapped.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
    cluster = [position];
  }
  if (cluster.length > 0) {
    snapped.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
  }

  return snapped;
}

/**
 * Groups rules into connected regions, so two tables on one page produce two
 * grids rather than one grid spanning the gap between them. Two rules are
 * connected when their spans overlap along the shared axis.
 */
function _clusterRulesIntoRegions(
  rules: readonly RuleSegment[],
): RuleSegment[][] {
  const horizontal = rules.filter((r) => {
    return r.orientation === "horizontal";
  });
  const vertical = rules.filter((r) => {
    return r.orientation === "vertical";
  });

  const regions: RuleSegment[][] = [];

  for (const vRule of vertical) {
    const matchingRegion = regions.find((region) => {
      return region.some((existing) => {
        return (
          existing.orientation === "vertical" &&
          Math.abs(existing.position - vRule.position) < 400 &&
          existing.span[0] <= vRule.span[1] &&
          vRule.span[0] <= existing.span[1]
        );
      });
    });
    if (matchingRegion) {
      matchingRegion.push(vRule);
    } else {
      regions.push([vRule]);
    }
  }

  // Attach each horizontal rule to every region whose vertical rules it
  // actually crosses. A rule spanning both tables would otherwise glue them
  // together.
  for (const hRule of horizontal) {
    for (const region of regions) {
      const crossesRegion = region.some((existing) => {
        return (
          existing.orientation === "vertical" &&
          existing.position >= hRule.span[0] - SNAP_TOLERANCE &&
          existing.position <= hRule.span[1] + SNAP_TOLERANCE &&
          existing.span[0] <= hRule.position + SNAP_TOLERANCE &&
          hRule.position <= existing.span[1] + SNAP_TOLERANCE
        );
      });
      if (crossesRegion) {
        region.push(hRule);
      }
    }
  }

  return regions;
}

function _buildTable(
  page: PageGeometry,
  regionRules: readonly RuleSegment[],
): CandidateTable | undefined {
  const gridX = _snapPositions(
    regionRules
      .filter((r) => {
        return r.orientation === "vertical";
      })
      .map((r) => {
        return r.position;
      }),
  );
  // Row boundaries descend down the page, and y grows upward in PDF space,
  // so the grid reads top to bottom when sorted descending.
  const gridY = _snapPositions(
    regionRules
      .filter((r) => {
        return r.orientation === "horizontal";
      })
      .map((r) => {
        return r.position;
      }),
  ).reverse();

  if (gridX.length < MIN_GRID_LINES || gridY.length < MIN_GRID_LINES) {
    return undefined;
  }

  const bbox: BBox = [
    gridX[0]!,
    gridY[gridY.length - 1]!,
    gridX[gridX.length - 1]!,
    gridY[0]!,
  ];

  const rowCount = gridY.length - 1;
  const columnCount = gridX.length - 1;
  const cells: string[][] = Array.from({ length: rowCount }, () => {
    return Array.from({ length: columnCount }, () => {
      return "";
    });
  });

  for (const item of page.textItems) {
    const columnIndex = gridX.findIndex((boundary, index) => {
      const next = gridX[index + 1];
      return next !== undefined && item.x >= boundary && item.x < next;
    });
    const rowIndex = gridY.findIndex((boundary, index) => {
      const next = gridY[index + 1];
      return next !== undefined && item.y <= boundary && item.y > next;
    });

    if (columnIndex < 0 || rowIndex < 0) {
      continue;
    }
    const existing = cells[rowIndex]![columnIndex]!;
    // Text wrapping inside a cell arrives as several items. Joining with a
    // space reassembles the cell rather than inventing extra rows.
    cells[rowIndex]![columnIndex] =
      existing === "" ? item.text : `${existing} ${item.text}`;
  }

  return {
    pageIndex: page.pageIndex,
    bbox,
    detectionMode: "lattice",
    gridX,
    gridY,
    cells: cells.map((row) => {
      return row.map(normalizeCellValue);
    }),
  };
}

/**
 * Finds tables by reading the ruling lines the generator drew.
 *
 * This is Camelot's lattice mode without the raster round-trip. Camelot
 * rasterizes the page and runs OpenCV morphology to rediscover lines that
 * were vector geometry to begin with; we read that geometry directly, which
 * is both more accurate and free of any image dependency.
 */
export function detectLatticeTables(
  page: PageGeometry,
): readonly CandidateTable[] {
  return _clusterRulesIntoRegions(page.rules)
    .map((regionRules) => {
      return _buildTable(page, regionRules);
    })
    .filter((table): table is CandidateTable => {
      return table !== undefined;
    })
    .sort((a, b) => {
      return a.bbox[0] - b.bbox[0];
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectLatticeTables.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: detect ruled pdf tables from content-stream geometry"
```

---

## Task 2: Tagged structure tree detection

**Files:**
- Create: `src/workers/pdfSniff/detectTaggedTables.ts`
- Create: `src/workers/pdfSniff/detectTaggedTables.test.ts`

Signal A, and the only one that is ground truth rather than inference. It runs
first and its results outrank the others during dedup.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectTaggedTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectTaggedTables } from "./detectTaggedTables";
import type { StructTreeNode } from "./detectTaggedTables";
import type { PageGeometry, TextItem } from "./types";

function textItem(text: string, x: number, y: number, id: string): TextItem & {
  id: string;
} {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
    id,
  };
}

const PAGE: PageGeometry = {
  pageIndex: 0,
  width: 595,
  height: 842,
  looksScanned: false,
  rules: [],
  textItems: [
    textItem("District", 100, 540, "t1"),
    textItem("Cases", 200, 540, "t2"),
    textItem("Gao", 100, 510, "t3"),
    textItem("1204", 200, 510, "t4"),
  ],
};

/** A 2x2 table with a header row, in pdf.js's structure tree shape. */
const STRUCT_TREE: StructTreeNode = {
  role: "Document",
  children: [
    {
      role: "Table",
      children: [
        {
          role: "TR",
          children: [
            { role: "TH", children: [{ type: "content", id: "t1" }] },
            { role: "TH", children: [{ type: "content", id: "t2" }] },
          ],
        },
        {
          role: "TR",
          children: [
            { role: "TD", children: [{ type: "content", id: "t3" }] },
            { role: "TD", children: [{ type: "content", id: "t4" }] },
          ],
        },
      ],
    },
  ],
};

describe("detectTaggedTables", () => {
  it("reads the cell grid straight out of the structure tree", () => {
    const [table] = detectTaggedTables(PAGE, STRUCT_TREE, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
      t4: PAGE.textItems[3]!,
    });

    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("tagged");
    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
    ]);
  });

  it("returns nothing when the document has no structure tree", () => {
    // Roughly 85 percent of PDFs in the wild are untagged, so this is the
    // common case rather than an edge case.
    expect(detectTaggedTables(PAGE, null, {})).toEqual([]);
  });

  it("returns nothing when the tree has no Table nodes", () => {
    const proseOnly: StructTreeNode = {
      role: "Document",
      children: [{ role: "P", children: [{ type: "content", id: "t1" }] }],
    };

    expect(detectTaggedTables(PAGE, proseOnly, {})).toEqual([]);
  });

  it("finds a Table nested below other structure elements", () => {
    const nested: StructTreeNode = {
      role: "Document",
      children: [{ role: "Sect", children: [STRUCT_TREE.children![0]!] }],
    };

    const tables = detectTaggedTables(nested === nested ? PAGE : PAGE, nested, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
      t4: PAGE.textItems[3]!,
    });

    expect(tables).toHaveLength(1);
  });

  it("pads short rows so every row has the same column count", () => {
    // A row with a missing trailing cell would otherwise produce a ragged
    // array that breaks CSV serialisation downstream.
    const ragged: StructTreeNode = {
      role: "Table",
      children: [
        {
          role: "TR",
          children: [
            { role: "TH", children: [{ type: "content", id: "t1" }] },
            { role: "TH", children: [{ type: "content", id: "t2" }] },
          ],
        },
        {
          role: "TR",
          children: [
            { role: "TD", children: [{ type: "content", id: "t3" }] },
          ],
        },
      ],
    };

    const [table] = detectTaggedTables(PAGE, ragged, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
    });

    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", ""],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectTaggedTables.test.ts`
Expected: FAIL, cannot resolve `./detectTaggedTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectTaggedTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, TextItem } from "./types";

/**
 * pdf.js's structure tree shape. Interior nodes carry a `role` (the PDF
 * structure type: Table, TR, TD, P, and so on); leaves are content items
 * whose `id` matches a marked-content id on the page.
 */
export type StructTreeNode = {
  role?: string;
  type?: string;
  id?: string;
  children?: readonly StructTreeNode[];
};

/** Maps a marked-content id to the text item it labels. */
export type ContentItemIndex = Readonly<Record<string, TextItem>>;

function _collectTableNodes(node: StructTreeNode): StructTreeNode[] {
  if (node.role === "Table") {
    return [node];
  }
  return (node.children ?? []).flatMap(_collectTableNodes);
}

/** Concatenates every content leaf beneath a node into one cell string. */
function _cellText(
  node: StructTreeNode,
  contentIndex: ContentItemIndex,
): string {
  if (node.type === "content" && node.id !== undefined) {
    return contentIndex[node.id]?.text ?? "";
  }
  return (node.children ?? [])
    .map((child) => {
      return _cellText(child, contentIndex);
    })
    .filter((text) => {
      return text !== "";
    })
    .join(" ");
}

function _collectTextItems(
  node: StructTreeNode,
  contentIndex: ContentItemIndex,
): TextItem[] {
  if (node.type === "content" && node.id !== undefined) {
    const item = contentIndex[node.id];
    return item ? [item] : [];
  }
  return (node.children ?? []).flatMap((child) => {
    return _collectTextItems(child, contentIndex);
  });
}

function _bboxOf(items: readonly TextItem[], page: PageGeometry): BBox {
  if (items.length === 0) {
    return [0, 0, page.width, page.height];
  }
  const xs = items.flatMap((i) => {
    return [i.x, i.x + i.width];
  });
  const ys = items.flatMap((i) => {
    return [i.y, i.y + i.height];
  });
  return [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];
}

/**
 * Reads tables out of a tagged PDF's logical structure tree.
 *
 * When a document is tagged this is ground truth rather than inference: the
 * generator recorded the cell grid, the header rows, and the spans, and we
 * are simply reading them back. That is why tagged results outrank lattice
 * and stream results during deduplication.
 *
 * The catch is coverage. Only around 10 to 15 percent of PDFs in the wild
 * are tagged at all, so this returns an empty array most of the time and the
 * other two signals do the work.
 */
export function detectTaggedTables(
  page: PageGeometry,
  structTree: StructTreeNode | null,
  contentIndex: ContentItemIndex,
): readonly CandidateTable[] {
  if (!structTree) {
    return [];
  }

  return _collectTableNodes(structTree).flatMap((tableNode) => {
    const rowNodes = (tableNode.children ?? []).filter((child) => {
      return child.role === "TR";
    });
    if (rowNodes.length === 0) {
      return [];
    }

    const rawCells = rowNodes.map((rowNode) => {
      return (rowNode.children ?? [])
        .filter((cell) => {
          return cell.role === "TD" || cell.role === "TH";
        })
        .map((cell) => {
          return normalizeCellValue(_cellText(cell, contentIndex));
        });
    });

    // Pad short rows. A ragged array breaks CSV serialisation downstream,
    // and a missing trailing cell is far more likely to be an omitted empty
    // value than a genuinely different row shape.
    const columnCount = Math.max(
      ...rawCells.map((row) => {
        return row.length;
      }),
    );
    const cells = rawCells.map((row) => {
      return [
        ...row,
        ...Array.from({ length: columnCount - row.length }, () => {
          return "";
        }),
      ];
    });

    const items = _collectTextItems(tableNode, contentIndex);
    const bbox = _bboxOf(items, page);

    return [
      {
        pageIndex: page.pageIndex,
        bbox,
        detectionMode: "tagged" as const,
        // The structure tree supplies the grid directly, so there are no
        // snapped coordinates to record. Persisted as null; see the
        // `grid_x` / `grid_y` columns.
        gridX: [],
        gridY: [],
        cells,
      },
    ];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectTaggedTables.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: read tables from tagged pdf structure trees"
```

---

## Task 3: Stream detection from whitespace

**Files:**
- Create: `src/workers/pdfSniff/detectStreamTables.ts`
- Create: `src/workers/pdfSniff/detectStreamTables.test.ts`

The least reliable signal, and always surfaced as such. It exists because
borderless tables are common enough that omitting it would gut the feature.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectStreamTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectStreamTables } from "./detectStreamTables";
import type { PageGeometry, TextItem } from "./types";

function textItem(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

/** Three rows of three columns at x 100, 250, 400, with no rules. */
function borderlessTablePage(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [],
    textItems: [
      textItem("District", 100, 600),
      textItem("Cases", 250, 600),
      textItem("Deaths", 400, 600),
      textItem("Gao", 100, 580),
      textItem("1204", 250, 580),
      textItem("31", 400, 580),
      textItem("Mopti", 100, 560),
      textItem("987", 250, 560),
      textItem("22", 400, 560),
    ],
  };
}

describe("detectStreamTables", () => {
  it("recovers a borderless table from column alignment", () => {
    const [table] = detectStreamTables(borderlessTablePage());

    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("stream");
    expect(table!.cells).toEqual([
      ["District", "Cases", "Deaths"],
      ["Gao", "1204", "31"],
      ["Mopti", "987", "22"],
    ]);
  });

  it("groups items on the same baseline into one row", () => {
    // Baselines drift by a fraction of a point within a row. Treating that
    // as a new row would produce one row per cell.
    const page = borderlessTablePage();
    const jittered: PageGeometry = {
      ...page,
      textItems: [
        textItem("Gao", 100, 580),
        textItem("1204", 250, 580.4),
        textItem("31", 400, 579.7),
      ],
    };

    const [table] = detectStreamTables(jittered);
    expect(table!.cells).toHaveLength(1);
    expect(table!.cells[0]).toHaveLength(3);
  });

  it("ignores prose, which has no consistent column structure", () => {
    // A paragraph produces rows of wildly varying item counts and no
    // persistent whitespace corridors. Reporting it as a table would bury
    // real results under noise.
    const prose: PageGeometry = {
      pageIndex: 0,
      width: 595,
      height: 842,
      looksScanned: false,
      rules: [],
      textItems: [
        textItem("The quick brown fox jumps over the lazy dog and", 72, 600),
        textItem("continues running through the field until it", 72, 585),
        textItem("reaches the river at the far edge of the", 72, 570),
      ],
    };

    expect(detectStreamTables(prose)).toEqual([]);
  });

  it("requires several rows before calling something a table", () => {
    const twoItems: PageGeometry = {
      ...borderlessTablePage(),
      textItems: [textItem("District", 100, 600), textItem("Cases", 250, 600)],
    };

    expect(detectStreamTables(twoItems)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectStreamTables.test.ts`
Expected: FAIL, cannot resolve `./detectStreamTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectStreamTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, TextItem } from "./types";

/** Baselines within this many points belong to the same visual row. */
const ROW_TOLERANCE = 3;

/** Left edges within this many points belong to the same column. */
const COLUMN_TOLERANCE = 6;

/** Fewer rows than this is not worth calling a table. */
const MIN_ROWS = 3;

/** Fewer columns than this is a list, not a table. */
const MIN_COLUMNS = 2;

/**
 * Fraction of rows that must contain an item at a given column position for
 * that position to count as a real column. Prose happens to align
 * occasionally; a genuine column is populated consistently.
 */
const MIN_COLUMN_OCCUPANCY = 0.6;

function _groupIntoRows(
  items: readonly TextItem[],
): TextItem[][] {
  const rows: TextItem[][] = [];

  for (const item of items) {
    const existingRow = rows.find((row) => {
      const head = row[0];
      return head !== undefined && Math.abs(head.y - item.y) <= ROW_TOLERANCE;
    });
    if (existingRow) {
      existingRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows
    .map((row) => {
      return [...row].sort((a, b) => {
        return a.x - b.x;
      });
    })
    .sort((a, b) => {
      return (b[0]?.y ?? 0) - (a[0]?.y ?? 0);
    });
}

/**
 * Finds x positions that recur across enough rows to be real columns.
 *
 * This is the crux of stream detection and the reason it earns only medium
 * or low confidence: alignment is evidence of a column, not proof of one.
 */
function _findColumnPositions(rows: ReadonlyArray<readonly TextItem[]>): number[] {
  const clusters: { position: number; rowsSeen: Set<number> }[] = [];

  rows.forEach((row, rowIndex) => {
    for (const item of row) {
      const existing = clusters.find((cluster) => {
        return Math.abs(cluster.position - item.x) <= COLUMN_TOLERANCE;
      });
      if (existing) {
        existing.rowsSeen.add(rowIndex);
      } else {
        clusters.push({ position: item.x, rowsSeen: new Set([rowIndex]) });
      }
    }
  });

  return clusters
    .filter((cluster) => {
      return cluster.rowsSeen.size / rows.length >= MIN_COLUMN_OCCUPANCY;
    })
    .map((cluster) => {
      return cluster.position;
    })
    .sort((a, b) => {
      return a - b;
    });
}

/**
 * Recovers tables that have no ruling lines, using text alignment alone.
 *
 * Borderless tables are common in agency and NGO reporting, so skipping this
 * signal would leave a large class of real documents unimportable. But the
 * inference is genuinely weaker than the other two signals, so results are
 * always surfaced with a visible caveat rather than presented as facts.
 */
export function detectStreamTables(
  page: PageGeometry,
): readonly CandidateTable[] {
  const rows = _groupIntoRows(page.textItems);
  if (rows.length < MIN_ROWS) {
    return [];
  }

  const columnPositions = _findColumnPositions(rows);
  if (columnPositions.length < MIN_COLUMNS) {
    return [];
  }

  const cells = rows.map((row) => {
    const rowCells = Array.from({ length: columnPositions.length }, () => {
      return "";
    });
    for (const item of row) {
      // Assign to the rightmost column whose position is at or left of the
      // item, which handles a value indented slightly inside its column.
      let columnIndex = 0;
      for (let c = 0; c < columnPositions.length; c += 1) {
        if (item.x >= columnPositions[c]! - COLUMN_TOLERANCE) {
          columnIndex = c;
        }
      }
      const existing = rowCells[columnIndex]!;
      rowCells[columnIndex] =
        existing === "" ? item.text : `${existing} ${item.text}`;
    }
    return rowCells.map(normalizeCellValue);
  });

  const xs = page.textItems.flatMap((i) => {
    return [i.x, i.x + i.width];
  });
  const ys = page.textItems.flatMap((i) => {
    return [i.y, i.y + i.height];
  });
  const bbox: BBox = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];

  return [
    {
      pageIndex: page.pageIndex,
      bbox,
      detectionMode: "stream",
      gridX: columnPositions,
      gridY: rows.map((row) => {
        return row[0]?.y ?? 0;
      }),
      cells,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectStreamTables.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: detect borderless pdf tables from text alignment"
```

---

## Task 4: Wire marked content into tagged detection

**Files:**
- Modify: `src/workers/pdfSniff/extractPageGeometry.ts`
- Modify: `src/workers/pdfSniff.worker.ts`
- Create: `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`

Until now the tagged detector receives an empty content index, so it never
produces a table from a real document. This task closes that gap and adds the
end-to-end fixture tests.

- [ ] **Step 1: Write the failing integration test**

Create `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { dedupeCandidates } from "./dedupeCandidates";
import { detectLatticeTables } from "./detectLatticeTables";
import { detectStreamTables } from "./detectStreamTables";
import { detectTaggedTables } from "./detectTaggedTables";
import { extractPageGeometry } from "./extractPageGeometry";
import { loadPdfDocument } from "./loadPdfJs";
import { mergePageSpans } from "./mergePageSpans";
import { scoreCandidate } from "./scoreCandidate";
import type { CandidateTable } from "./types";

const FIXTURES = {
  frontiers: "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf",
  plosDataQuality:
    "public/test-data/pdf/plos-one-online-research-data-quality.pdf",
  plosNcd: "public/test-data/pdf/plos-one-ncd-mobile-phone-surveys.pdf",
} as const;

async function detectTables(path: string, pageNumbers: readonly number[]) {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const candidates: CandidateTable[] = [];

  for (const pageNumber of pageNumbers) {
    const page = await doc.getPage(pageNumber);
    const { geometry, contentIndex } = await extractPageGeometry(
      page,
      pageNumber - 1,
      { includeMarkedContent: true },
    );
    const structTree = await page.getStructTree().catch(() => null);

    candidates.push(
      ...detectTaggedTables(geometry, structTree, contentIndex),
      ...detectLatticeTables(geometry),
      ...detectStreamTables(geometry),
    );
  }

  await doc.destroy();
  return mergePageSpans(dedupeCandidates(candidates)).map(scoreCandidate);
}

describe("detection against real fixtures", () => {
  it("uses the structure tree on the tagged Frontiers paper", async () => {
    const tables = await detectTables(FIXTURES.frontiers, [4]);

    expect(tables.length).toBeGreaterThan(0);
    expect(tables.some((t) => t.detectionMode === "tagged")).toBe(true);
  }, 30_000);

  it("finds two side-by-side tables as two tables", async () => {
    // Page 8 carries Table 2 and Table 3 in adjacent columns. Reporting one
    // wide table would silently splice unrelated data together.
    const tables = await detectTables(FIXTURES.frontiers, [8]);

    expect(tables.length).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("merges the untagged multi-page table in the PLOS data quality paper", async () => {
    // Table 1 continues under a "Table 1. (Continued)" caption, with no
    // structure tree to lean on.
    const tables = await detectTables(FIXTURES.plosDataQuality, [7, 8]);
    const multiPage = tables.find((t) => t.fragments.length > 1);

    expect(multiPage).toBeDefined();
  }, 30_000);

  it("does not read n (%) values as negative numbers", async () => {
    // The single most dangerous normalisation bug available in this corpus.
    const tables = await detectTables(FIXTURES.plosNcd, [8]);
    const allCells = tables.flatMap((t) => t.cells.flat());
    const negatives = allCells.filter((cell) => cell.startsWith("-"));

    expect(negatives).toEqual([]);
  }, 30_000);

  it("rates every detected table with an explicit confidence", async () => {
    const tables = await detectTables(FIXTURES.plosNcd, [8]);

    for (const table of tables) {
      expect(["high", "medium", "low"]).toContain(table.confidence);
      expect(table.confidenceNotes.length).toBeGreaterThan(0);
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts`
Expected: FAIL. `extractPageGeometry` does not accept a third argument and
does not return `{ geometry, contentIndex }`.

- [ ] **Step 3: Change `extractPageGeometry` to return a content index**

In `extractPageGeometry.ts`, change the signature and return shape:

```ts
export type PageGeometryResult = {
  geometry: PageGeometry;
  /** Marked-content id to text item, for the tagged detector. */
  contentIndex: Record<string, TextItem>;
};

export async function extractPageGeometry(
  page: PDFPageProxy,
  pageIndex: number,
  options: { includeMarkedContent?: boolean } = {},
): Promise<PageGeometryResult> {
```

Replace the `getTextContent()` call with:

```ts
  const textContent = await page.getTextContent({
    includeMarkedContent: options.includeMarkedContent ?? false,
  });
```

When `includeMarkedContent` is true, pdf.js interleaves
`{ type: "beginMarkedContentProps", id }` markers with the text items. Track
the most recent id and record it against each item:

```ts
  const contentIndex: Record<string, TextItem> = {};
  let currentMarkedContentId: string | undefined;
  const rawItems: TextItem[] = [];

  for (const rawItem of textContent.items) {
    if (!("str" in rawItem)) {
      // A marked-content boundary. `id` is present on begin markers and
      // absent on end markers, so an absent id clears the current scope.
      const markerId = (rawItem as { id?: string }).id;
      currentMarkedContentId = markerId;
      continue;
    }
    if (rawItem.str.length === 0) {
      continue;
    }
    const item: TextItem = {
      text: rawItem.str,
      x: rawItem.transform[4] ?? 0,
      y: rawItem.transform[5] ?? 0,
      width: rawItem.width ?? 0,
      height: rawItem.height ?? 0,
      fontName: rawItem.fontName ?? "",
      unmappedCharRatio: _unmappedCharRatio(rawItem.str),
    };
    rawItems.push(item);
    if (currentMarkedContentId !== undefined) {
      contentIndex[currentMarkedContentId] = item;
    }
  }

  const textItems = rawItems.sort((a, b) => {
    const yDelta = b.y - a.y;
    if (Math.abs(yDelta) > 1) {
      return yDelta;
    }
    return a.x - b.x;
  });
```

and return `{ geometry: { ... }, contentIndex }`.

- [ ] **Step 4: Update the existing geometry test**

`extractPageGeometry.test.ts` destructures the old return shape. Change its
helper to:

```ts
  const { geometry } = await extractPageGeometry(page, pageNumber - 1);
  await doc.destroy();
  return geometry;
```

- [ ] **Step 5: Update the worker call site**

In `pdfSniff.worker.ts`, replace the geometry call with:

```ts
      const { geometry, contentIndex } = await extractPageGeometry(
        page,
        pageNumber - 1,
        { includeMarkedContent: true },
      );
```

and delete the `const contentIndex: ContentItemIndex = {};` line.

- [ ] **Step 6: Run both test files**

```bash
pnpm vitest run src/workers/pdfSniff/extractPageGeometry.test.ts
pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts
```

Expected: PASS.

These are the tests most likely to need threshold tuning against real
documents. If a fixture test fails, print the detected tables and compare
against the PDF with
`pdftotext -layout <fixture> - | sed -n '<start>,<end>p'` before changing a
constant. Adjust the constant, never the assertion, unless the assertion is
demonstrably describing the wrong thing.

- [ ] **Step 7: Commit**

```bash
git add src/workers/pdfSniff/ src/workers/pdfSniff.worker.ts
git commit -m "feat: map marked content to text items for tagged detection"
```

---

## Task 5: Deduplicate candidates across signals

**Files:**
- Create: `src/workers/pdfSniff/dedupeCandidates.ts`
- Create: `src/workers/pdfSniff/dedupeCandidates.test.ts`

All three detectors run on every page, so a ruled table in a tagged document
is found three times. Without dedup the user sees the same table repeated with
different quality.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/dedupeCandidates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dedupeCandidates } from "./dedupeCandidates";
import type { BBox, CandidateTable, PdfDetectionModeAlias } from "./types";
import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

function candidate(options: {
  bbox: BBox;
  detectionMode: PdfDetectionMode;
  pageIndex?: number;
}): CandidateTable {
  return {
    pageIndex: options.pageIndex ?? 0,
    bbox: options.bbox,
    detectionMode: options.detectionMode,
    gridX: [],
    gridY: [],
    cells: [["a", "b"]],
  };
}

describe("dedupeCandidates", () => {
  it("keeps the tagged version when signals overlap", () => {
    // Tagged is ground truth read from the document; the other two are
    // inference. When they describe the same rectangle, trust the document.
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "stream" }),
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "tagged" }),
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.detectionMode).toBe("tagged");
  });

  it("prefers lattice over stream", () => {
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "stream" }),
      candidate({ bbox: [102, 498, 298, 562], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.detectionMode).toBe("lattice");
  });

  it("keeps tables that merely sit near each other", () => {
    // Two tables side by side must survive as two. This is the case that
    // makes naive merging destroy real data.
    const result = dedupeCandidates([
      candidate({ bbox: [60, 500, 260, 560], detectionMode: "lattice" }),
      candidate({ bbox: [330, 500, 530, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("keeps identical rectangles on different pages", () => {
    // A templated report puts a table at the same coordinates on every
    // page. Those are different tables, not duplicates.
    const result = dedupeCandidates([
      candidate({
        bbox: [100, 500, 300, 560],
        detectionMode: "lattice",
        pageIndex: 0,
      }),
      candidate({
        bbox: [100, 500, 300, 560],
        detectionMode: "lattice",
        pageIndex: 1,
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("treats partial overlap below the threshold as distinct tables", () => {
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "lattice" }),
      candidate({ bbox: [280, 500, 480, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(2);
  });
});
```

Delete the unused `PdfDetectionModeAlias` import if your editor flags it; it
is not part of `types.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/dedupeCandidates.test.ts`
Expected: FAIL, cannot resolve `./dedupeCandidates`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/dedupeCandidates.ts`:

```ts
import type { BBox, CandidateTable } from "./types";
import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/**
 * Intersection-over-union above which two rectangles on the same page are
 * considered the same table.
 */
const OVERLAP_THRESHOLD = 0.5;

/**
 * Higher wins. Tagged is read from the document itself; lattice reads
 * geometry the generator drew; stream infers from alignment.
 */
const MODE_RANK: Record<PdfDetectionMode, number> = {
  tagged: 3,
  lattice: 2,
  stream: 1,
  manual: 4,
};

function _intersectionOverUnion(a: BBox, b: BBox): number {
  const overlapWidth = Math.max(
    0,
    Math.min(a[2], b[2]) - Math.max(a[0], b[0]),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a[3], b[3]) - Math.max(a[1], b[1]),
  );
  const intersection = overlapWidth * overlapHeight;
  if (intersection === 0) {
    return 0;
  }

  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Collapses candidates that describe the same physical table.
 *
 * All three detectors run over every page, so a ruled table inside a tagged
 * document is proposed three times. The user should see it once, described
 * by the most trustworthy signal that found it.
 *
 * Overlap is only ever compared within a page. A templated report places its
 * table at identical coordinates on every page, and those are different
 * tables holding different data.
 */
export function dedupeCandidates(
  candidates: readonly CandidateTable[],
): readonly CandidateTable[] {
  const ranked = [...candidates].sort((a, b) => {
    return MODE_RANK[b.detectionMode] - MODE_RANK[a.detectionMode];
  });

  const kept: CandidateTable[] = [];

  for (const candidate of ranked) {
    const isDuplicate = kept.some((existing) => {
      return (
        existing.pageIndex === candidate.pageIndex &&
        _intersectionOverUnion(existing.bbox, candidate.bbox) >=
          OVERLAP_THRESHOLD
      );
    });
    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) {
      return a.pageIndex - b.pageIndex;
    }
    // Top of the page first, then left to right.
    if (Math.abs(b.bbox[3] - a.bbox[3]) > 1) {
      return b.bbox[3] - a.bbox[3];
    }
    return a.bbox[0] - b.bbox[0];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/dedupeCandidates.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: dedupe pdf table candidates across detection signals"
```

---

## Task 6: Merge tables that span pages

**Files:**
- Create: `src/workers/pdfSniff/mergePageSpans.ts`
- Create: `src/workers/pdfSniff/mergePageSpans.test.ts`

Both real untagged fixtures contain a table that continues onto a second page.
Merging is the default because it is right most of the time, and because the
mistake is visible in the UI and reversible with a split control.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/mergePageSpans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mergePageSpans } from "./mergePageSpans";
import type { CandidateTable } from "./types";

function fragment(options: {
  pageIndex: number;
  gridX: readonly number[];
  cells: ReadonlyArray<readonly string[]>;
}): CandidateTable {
  return {
    pageIndex: options.pageIndex,
    bbox: [100, 100, 400, 700],
    detectionMode: "lattice",
    gridX: options.gridX,
    gridY: [700, 400, 100],
    cells: options.cells,
  };
}

const HEADER = ["District", "Cases"];

describe("mergePageSpans", () => {
  it("merges consecutive pages with matching columns and a repeated header", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.fragments.map((f) => f.pageIndex)).toEqual([3, 4]);
    // The header appears once. The repeat on page 4 is page furniture, not
    // data, and leaving it in would inject a fake row mid-table.
    expect(merged[0]!.cells).toEqual([HEADER, ["Gao", "1204"], ["Mopti", "987"]]);
  });

  it("merges a continuation page that omits the header", () => {
    // Long statistical tables frequently drop the header on later pages.
    // Requiring a repeated header would miss them.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 250, 400],
        cells: [["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.cells).toEqual([HEADER, ["Gao", "1204"], ["Mopti", "987"]]);
  });

  it("does not merge across a gap in page numbers", () => {
    // Pages 3 and 7 are not a continuation, however similar they look.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 7,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("does not merge tables whose columns differ", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 200, 300, 400],
        cells: [["A", "B", "C"], ["1", "2", "3"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("does not merge when the column count matches but positions do not", () => {
    // Same shape, different layout, so almost certainly a different table.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [60, 300, 540],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("records the fragment count so the UI can offer a split", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 0,
        gridX: [100, 250, 400],
        cells: [HEADER, ["a", "1"]],
      }),
      fragment({
        pageIndex: 1,
        gridX: [100, 250, 400],
        cells: [HEADER, ["b", "2"]],
      }),
      fragment({
        pageIndex: 2,
        gridX: [100, 250, 400],
        cells: [HEADER, ["c", "3"]],
      }),
    ]);

    expect(merged[0]!.fragments).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/mergePageSpans.test.ts`
Expected: FAIL, cannot resolve `./mergePageSpans`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/mergePageSpans.ts`:

```ts
import type { BBox, CandidateTable } from "./types";

/** Column boundaries within this many points are the same layout. */
const COLUMN_MATCH_TOLERANCE = 6;

/** A merged table before scoring. */
export type MergedTable = {
  fragments: ReadonlyArray<{ pageIndex: number; bbox: BBox }>;
  detectionMode: CandidateTable["detectionMode"];
  gridX: readonly number[];
  gridY: readonly number[];
  cells: ReadonlyArray<readonly string[]>;
};

function _columnsMatch(a: CandidateTable, b: CandidateTable): boolean {
  // Tagged tables carry no snapped grid, so fall back to column count.
  if (a.gridX.length === 0 || b.gridX.length === 0) {
    const aColumns = a.cells[0]?.length ?? 0;
    const bColumns = b.cells[0]?.length ?? 0;
    return aColumns > 0 && aColumns === bColumns;
  }

  if (a.gridX.length !== b.gridX.length) {
    return false;
  }
  return a.gridX.every((position, index) => {
    return Math.abs(position - b.gridX[index]!) <= COLUMN_MATCH_TOLERANCE;
  });
}

function _rowsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((cell, i) => cell === b[i]);
}

/**
 * Joins table fragments that are really one table continuing across pages.
 *
 * Merging is the default because it is correct most of the time, and because
 * a wrong merge is visible in the picker and reversible with the split
 * control. The opposite default, listing a 40-page statistical table as 40
 * separate items, is technically never wrong and practically unusable.
 *
 * Two guards keep false merges rare: fragments must be on consecutive pages,
 * and their column layouts must match within tolerance. A templated report
 * whose pages each carry a different table will usually differ in column
 * positions; when it does not, the split control is the remedy.
 */
export function mergePageSpans(
  candidates: readonly CandidateTable[],
): readonly MergedTable[] {
  const ordered = [...candidates].sort((a, b) => {
    return a.pageIndex - b.pageIndex;
  });

  const merged: MergedTable[] = [];
  let currentGroup: CandidateTable[] = [];

  const flush = (): void => {
    if (currentGroup.length === 0) {
      return;
    }
    const first = currentGroup[0]!;
    const headerRow = first.cells[0];

    const cells = currentGroup.flatMap((fragment, fragmentIndex) => {
      if (fragmentIndex === 0 || !headerRow) {
        return fragment.cells;
      }
      // Drop a repeated header on a continuation page. Keeping it would
      // inject a row of column names into the middle of the data.
      const [firstRow, ...rest] = fragment.cells;
      if (firstRow && _rowsEqual(firstRow, headerRow)) {
        return rest;
      }
      return fragment.cells;
    });

    merged.push({
      fragments: currentGroup.map((fragment) => {
        return { pageIndex: fragment.pageIndex, bbox: fragment.bbox };
      }),
      detectionMode: first.detectionMode,
      gridX: first.gridX,
      gridY: first.gridY,
      cells,
    });
    currentGroup = [];
  };

  for (const candidate of ordered) {
    const previous = currentGroup[currentGroup.length - 1];
    const continuesPrevious =
      previous !== undefined &&
      candidate.pageIndex === previous.pageIndex + 1 &&
      _columnsMatch(previous, candidate);

    if (!continuesPrevious) {
      flush();
    }
    currentGroup.push(candidate);
  }
  flush();

  return merged;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/mergePageSpans.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: merge pdf table fragments across page spans"
```

---

## Task 7: Score confidence and detect headers

**Files:**
- Create: `src/workers/pdfSniff/scoreCandidate.ts`
- Create: `src/workers/pdfSniff/scoreCandidate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/scoreCandidate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreCandidate } from "./scoreCandidate";
import type { MergedTable } from "./mergePageSpans";

function table(options: {
  detectionMode: MergedTable["detectionMode"];
  cells: ReadonlyArray<readonly string[]>;
}): MergedTable {
  return {
    fragments: [{ pageIndex: 0, bbox: [100, 100, 400, 700] }],
    detectionMode: options.detectionMode,
    gridX: [100, 250, 400],
    gridY: [700, 400, 100],
    cells: options.cells,
  };
}

const CLEAN_CELLS = [
  ["District", "Cases", "Deaths"],
  ["Gao", "1204", "31"],
  ["Mopti", "987", "22"],
];

describe("scoreCandidate", () => {
  it("rates a tagged table as high confidence", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "tagged", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("high");
    expect(scored.confidenceNotes.join(" ")).toMatch(/structure tree/i);
  });

  it("rates a well-filled lattice table as high confidence", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("high");
  });

  it("rates a stream table as medium at best and says why", () => {
    // The caveat is the point: a user cannot sanity-check a guess they were
    // not told was a guess.
    const scored = scoreCandidate(
      table({ detectionMode: "stream", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("medium");
    expect(scored.confidenceNotes.join(" ")).toMatch(/alignment/i);
  });

  it("downgrades a sparsely filled table", () => {
    const sparse = [
      ["A", "B", "C"],
      ["1", "", ""],
      ["", "", ""],
      ["", "2", ""],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: sparse }),
    );

    expect(scored.confidence).toBe("low");
    expect(scored.confidenceNotes.join(" ")).toMatch(/empty/i);
  });

  it("detects a single header row", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: CLEAN_CELLS }),
    );

    expect(scored.headerRows).toBe(1);
  });

  it("detects two header rows when the first two are non-numeric", () => {
    // Government statistical tables stack a spanning header over a detail
    // header. Treating the second as data would inject a junk row and lose
    // the real column names.
    const spanning = [
      ["", "2024", "2024", "2025", "2025"],
      ["Region", "Q1", "Q2", "Q1", "Q2"],
      ["Gao", "1", "2", "3", "4"],
      ["Mopti", "5", "6", "7", "8"],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: spanning }),
    );

    expect(scored.headerRows).toBe(2);
  });

  it("counts merged cells that were filled down", () => {
    const withMerges = [
      ["Region", "City", "Pop"],
      ["North", "Gao", "1204"],
      ["", "Mopti", "987"],
      ["", "Segou", "654"],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: withMerges }),
    );

    expect(scored.mergedCellCount).toBe(2);
    expect(scored.cells[2]![0]).toBe("North");
    expect(scored.cells[3]![0]).toBe("North");
  });

  it("does not fill down a column that is simply mostly empty", () => {
    // Fill-down applies to a leading grouping column, not to any blank. A
    // sparse notes column must stay sparse.
    const sparseNotes = [
      ["City", "Notes"],
      ["Gao", "checked"],
      ["Mopti", ""],
      ["Segou", ""],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: sparseNotes }),
    );

    expect(scored.cells[2]![1]).toBe("");
    expect(scored.cells[3]![1]).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/scoreCandidate.test.ts`
Expected: FAIL, cannot resolve `./scoreCandidate`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/scoreCandidate.ts`:

```ts
import type { MergedTable } from "./mergePageSpans";
import type { ScoredTable } from "./types";

/** Below this fill ratio a table is probably a misdetection. */
const MIN_FILL_RATIO = 0.5;

/** At most this many leading rows may be treated as header. */
const MAX_HEADER_ROWS = 3;

function _isNumericish(value: string): boolean {
  return value !== "" && /^-?\d+(\.\d+)?$/u.test(value);
}

function _fillRatio(cells: ReadonlyArray<readonly string[]>): number {
  const total = cells.reduce((sum, row) => {
    return sum + row.length;
  }, 0);
  if (total === 0) {
    return 0;
  }
  const filled = cells.reduce((sum, row) => {
    return (
      sum +
      row.filter((cell) => {
        return cell !== "";
      }).length
    );
  }, 0);
  return filled / total;
}

/**
 * Counts leading rows that carry no numbers. A header row is text; a data
 * row in any table worth importing has at least one number somewhere.
 */
function _detectHeaderRows(cells: ReadonlyArray<readonly string[]>): number {
  let headerRows = 0;
  for (let i = 0; i < Math.min(cells.length - 1, MAX_HEADER_ROWS); i += 1) {
    const row = cells[i]!;
    const hasNumber = row.some(_isNumericish);
    if (hasNumber) {
      break;
    }
    headerRows += 1;
  }
  return Math.max(1, headerRows);
}

/**
 * Fills a merged cell's value down into the rows it spans.
 *
 * Only applied to a leading run of columns, because that is where merged
 * grouping cells actually occur. Applying it to every column would corrupt
 * a legitimately sparse column such as free-text notes.
 */
function _fillMergedCellsDown(
  cells: ReadonlyArray<readonly string[]>,
  headerRows: number,
): { cells: string[][]; mergedCellCount: number } {
  const filled = cells.map((row) => {
    return [...row];
  });
  let mergedCellCount = 0;

  const columnCount = filled[0]?.length ?? 0;
  for (let column = 0; column < columnCount; column += 1) {
    // Stop at the first column that is not a grouping column. A grouping
    // column's first data cell is populated; a sparse notes column may not
    // be, but more importantly we only walk left-to-right and break out.
    const firstDataCell = filled[headerRows]?.[column] ?? "";
    if (firstDataCell === "") {
      break;
    }

    let lastValue = "";
    for (let row = headerRows; row < filled.length; row += 1) {
      const value = filled[row]![column]!;
      if (value !== "") {
        lastValue = value;
        continue;
      }
      if (lastValue !== "") {
        filled[row]![column] = lastValue;
        mergedCellCount += 1;
      }
    }

    // Only the leading grouping columns get this treatment.
    const hasBlanks = cells.some((row, rowIndex) => {
      return rowIndex >= headerRows && row[column] === "";
    });
    if (!hasBlanks) {
      break;
    }
  }

  return { cells: filled, mergedCellCount };
}

/**
 * Assigns a confidence rating and resolves header and merged-cell handling.
 *
 * Confidence is surfaced directly in the picker because the alternative is
 * presenting a guess with the same authority as a fact. A user can sanity
 * check a table they were told was inferred from alignment; they cannot
 * check one presented as certain.
 */
export function scoreCandidate(table: MergedTable): ScoredTable {
  const notes: string[] = [];
  const fillRatio = _fillRatio(table.cells);

  let confidence: ScoredTable["confidence"];
  if (table.detectionMode === "tagged") {
    confidence = "high";
    notes.push(
      "Read from the document's own structure tree, so the cell layout is exact.",
    );
  } else if (table.detectionMode === "lattice") {
    confidence = "high";
    notes.push("Built from the ruling lines drawn in the document.");
  } else if (table.detectionMode === "manual") {
    confidence = "high";
    notes.push("You selected this region yourself.");
  } else {
    confidence = "medium";
    notes.push(
      "This table has no ruling lines, so its columns were guessed from text alignment. Check it carefully.",
    );
  }

  if (fillRatio < MIN_FILL_RATIO) {
    confidence = "low";
    notes.push(
      `${Math.round((1 - fillRatio) * 100)} percent of the cells are empty, which often means the grid was misread.`,
    );
  }

  const headerRows = _detectHeaderRows(table.cells);
  const { cells, mergedCellCount } = _fillMergedCellsDown(
    table.cells,
    headerRows,
  );

  if (mergedCellCount > 0) {
    notes.push(
      `${mergedCellCount} merged ${mergedCellCount === 1 ? "cell was" : "cells were"} filled down.`,
    );
  }

  return {
    fragments: table.fragments,
    detectionMode: table.detectionMode,
    gridX: table.gridX,
    gridY: table.gridY,
    cells,
    confidence,
    confidenceNotes: notes,
    headerRows,
    mergedCellCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/scoreCandidate.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: score pdf table confidence and resolve headers"
```

---

## Task 8: Surface detected tables as regions

**Files:**
- Create: `src/workers/pdfSniff/candidatesToRegions.ts`
- Create: `src/workers/pdfSniff/candidatesToRegions.test.ts`
- Modify: `src/workers/pdfSniff.worker.ts`
- Modify: `.../ManualUploadView/PdfTablePicker/PdfRegionPicker.tsx`

**New in this phase.** This is where detection meets the rest of the feature.
A detected table does not become a dataset directly; it becomes a **suggested
region** of shape `grid_table`, which Phase B2's `extractGridTable` then reads
exactly as it reads a region the user drew.

That indirection is what stops this phase from needing its own extraction, its
own preview and its own save path.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/candidatesToRegions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { candidatesToRegions } from "./candidatesToRegions";
import type { ScoredTable } from "./types";

function scoredTable(overrides: Partial<ScoredTable> = {}): ScoredTable {
  return {
    fragments: [{ pageIndex: 0, bbox: [100, 500, 400, 600] }],
    detectionMode: "lattice",
    gridX: [100, 250, 400],
    gridY: [600, 580, 560],
    cells: [
      ["District", "Cases"],
      ["Gao", "1204"],
    ],
    confidence: "high",
    confidenceNotes: ["Ruled grid"],
    headerRows: 1,
    mergedCellCount: 0,
    ...overrides,
  };
}

describe("candidatesToRegions", () => {
  it("turns a detected table into a grid_table region", () => {
    const [region] = candidatesToRegions([scoredTable()]);

    expect(region!.shape).toBe("grid_table");
    expect(region!.detectionMode).toBe("lattice");
    expect(region!.fragments).toEqual([{ page: 0, bbox: [100, 500, 400, 600] }]);
  });

  it("carries the grid and header count into region options", () => {
    // Without these the extractor would re-derive the grid and could land on
    // different cell boundaries than the detector reported to the user.
    const [region] = candidatesToRegions([scoredTable({ headerRows: 2 })]);

    expect(region!.options).toMatchObject({
      gridX: [100, 250, 400],
      gridY: [600, 580, 560],
      headerRows: 2,
    });
  });

  it("labels regions by page and position, not by ordinal alone", () => {
    // "Table 3" is an output of our own detector: improving detection would
    // silently renumber it. Page and position are stable.
    const [region] = candidatesToRegions([scoredTable()]);

    expect(region!.label).toBe("Table on page 1");
  });

  it("disambiguates several tables on one page", () => {
    const regions = candidatesToRegions([
      scoredTable({ fragments: [{ pageIndex: 0, bbox: [50, 500, 250, 600] }] }),
      scoredTable({ fragments: [{ pageIndex: 0, bbox: [300, 500, 500, 600] }] }),
    ]);

    expect(regions.map((r) => r.label)).toEqual([
      "Table on page 1 (left)",
      "Table on page 1 (right)",
    ]);
  });

  it("names a multi-page table by its page span", () => {
    const [region] = candidatesToRegions([
      scoredTable({
        fragments: [
          { pageIndex: 3, bbox: [100, 100, 400, 600] },
          { pageIndex: 4, bbox: [100, 100, 400, 600] },
        ],
      }),
    ]);

    expect(region!.label).toBe("Table on pages 4 to 5");
  });

  it("gives every region a stable unique id", () => {
    const regions = candidatesToRegions([scoredTable(), scoredTable()]);

    expect(regions[0]!.id).not.toBe(regions[1]!.id);
  });

  it("passes the confidence notes through for the picker to show", () => {
    const [region] = candidatesToRegions([
      scoredTable({ confidence: "low", confidenceNotes: ["Guessed from text alignment"] }),
    ]);

    expect(region!.options).toMatchObject({
      confidence: "low",
      confidenceNotes: ["Guessed from text alignment"],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/candidatesToRegions.test.ts`
Expected: FAIL, cannot resolve `./candidatesToRegions`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/candidatesToRegions.ts`:

```ts
import type { PdfRegion, ScoredTable } from "./types";

/**
 * Two tables on the same page are distinguished by which half they sit in,
 * which is how a reader would describe them.
 */
function _horizontalHint(
  table: ScoredTable,
  siblings: readonly ScoredTable[],
): string {
  if (siblings.length < 2) {
    return "";
  }
  const centre = (table.fragments[0]!.bbox[0] + table.fragments[0]!.bbox[2]) / 2;
  const others = siblings.filter((s) => {
    return s !== table;
  });
  const isLeftmost = others.every((other) => {
    const otherCentre =
      (other.fragments[0]!.bbox[0] + other.fragments[0]!.bbox[2]) / 2;
    return centre <= otherCentre;
  });
  return isLeftmost ? " (left)" : " (right)";
}

function _label(
  table: ScoredTable,
  samePageTables: readonly ScoredTable[],
): string {
  const pages = table.fragments.map((fragment) => {
    return fragment.pageIndex + 1;
  });
  const first = pages[0]!;
  const last = pages[pages.length - 1]!;

  if (first !== last) {
    return `Table on pages ${first} to ${last}`;
  }
  return `Table on page ${first}${_horizontalHint(table, samePageTables)}`;
}

/**
 * Converts scored detections into regions the picker can offer alongside the
 * ones a user draws.
 *
 * Detection proposes geometry; it does not extract. Feeding results through
 * the same `PdfRegion` shape means a detected table and a hand-drawn box take
 * exactly one code path from here on, so the preview, the review grid and the
 * save flow never learn there was a difference.
 */
export function candidatesToRegions(
  tables: readonly ScoredTable[],
): readonly PdfRegion[] {
  return tables.map((table, index) => {
    const samePageTables = tables.filter((other) => {
      return (
        other.fragments.length === 1 &&
        table.fragments.length === 1 &&
        other.fragments[0]!.pageIndex === table.fragments[0]!.pageIndex
      );
    });

    return {
      id: `detected-${index}`,
      label: _label(table, samePageTables),
      shape: "grid_table",
      detectionMode: table.detectionMode,
      fragments: table.fragments.map((fragment) => {
        return { page: fragment.pageIndex, bbox: fragment.bbox };
      }),
      options: {
        gridX: table.gridX,
        gridY: table.gridY,
        headerRows: table.headerRows,
        confidence: table.confidence,
        confidenceNotes: table.confidenceNotes,
        mergedCellCount: table.mergedCellCount,
      },
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/candidatesToRegions.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add a detect message to the worker**

In `src/workers/pdfSniff.worker.ts`, add a second request type beside `sniff`.
Detection is a separate message rather than part of the sniff so that a user
who only wants to draw a box never pays for a full-document scan:

```ts
type DetectRequest = {
  type: "detect";
  pages: readonly PageGeometry[];
};

export type PdfDetectResult = {
  type: "detect_result";
  regions: readonly PdfRegion[];
};
```

Handle it by running the three detectors over the supplied geometry, then
dedup, merge, score and convert:

```ts
  if (request.type === "detect") {
    const candidates = request.pages.flatMap((page) => {
      return [
        ...detectTaggedTables(page, page.structTree ?? null, page.contentIndex ?? {}),
        ...detectLatticeTables(page),
        ...detectStreamTables(page),
      ];
    });
    const tables = mergePageSpans(dedupeCandidates(candidates)).map(
      scoreCandidate,
    );
    _post({ type: "detect_result", regions: candidatesToRegions(tables) });
    _close();
    return;
  }
```

Add the matching `detectPdfTables` driver in `src/clients/datasets/pdfSniff.ts`,
mirroring `sniffPdfFile`.

- [ ] **Step 6: Offer detected regions in the picker**

In `PdfRegionPicker.tsx`, add a "Find tables automatically" button that calls
`detectPdfTables`, then appends the returned regions to the region list with a
badge showing `options.confidence`. A low-confidence region must render the
`confidenceNotes` text beside it, so a guess is never presented as a fact.

- [ ] **Step 7: Verify**

Run: `pnpm type-check && pnpm lint && pnpm vitest run src/workers/pdfSniff/`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/workers/pdfSniff/ src/clients/datasets/ src/views/DataManagerApp/
git commit -m "feat: offer automatically detected tables as regions"
```

---

## Task 9: Synthetic fixtures for the uncovered cases

**Files:**
- Create: `scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts`
- Create: `public/test-data/pdf/synthetic-scanned-no-text-layer.pdf`
- Create: `public/test-data/pdf/synthetic-fully-ruled-statistics.pdf`
- Create: `public/test-data/pdf/synthetic-financial-statement.pdf`
- Modify: `public/test-data/pdf/README.md`

The three real fixtures leave three gaps, listed in that README. These must be
generated because no suitably licensed real sample was available, and because
generated content is exactly right here: we are testing structural handling,
not text fidelity.

- [ ] **Step 1: Write the generator**

**Use Playwright, not jspdf.** jspdf cannot produce the scanned fixture: it
needs a raster of rendered text, and there is no canvas in a Node script.
Playwright is already a dev dependency and Chromium is already installed, so
`page.pdf()` gives us real browser-generated PDFs, which is also a more
realistic generator than a JS PDF writer.

Create `scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts` as a
Playwright script that writes three files:

1. **`synthetic-fully-ruled-statistics.pdf`** — an HTML table with
   `border-collapse: collapse` and a visible border on **every** cell, so the
   lattice detector sees a complete grid. The three real fixtures use
   horizontal rules only, per journal house style, so nothing currently tests
   the full-grid path. Give it a two-level spanning header (`colspan`) and
   enough rows to break across three printed pages under a repeated
   `<thead>`. Produce with `page.pdf({ format: "A4" })`.

2. **`synthetic-financial-statement.pdf`** — a balance sheet where
   parentheses genuinely mean negative (`(1,234)`), with currency symbols and
   right-aligned numeric columns. This is the counterpart to the `n (%)` case:
   Task 3 must convert here and must not convert there, and only having both
   fixtures pins that behaviour down.

3. **`synthetic-scanned-no-text-layer.pdf`** — built in two passes. First
   render a normal HTML table and `page.screenshot()` it to PNG. Then load a
   second page whose entire body is `<img src="data:image/png;base64,...">`
   sized to the sheet, and `page.pdf()` that. The result contains a raster
   image and no text layer at all, which is the only way to exercise the
   `no_text_layer` guard.

All text may be lorem ipsum and all numbers randomly chosen. Nothing needs to
resemble a real document beyond its layout: we are testing structural
handling, not content.

Because scripts cannot use `Math.random()` reproducibly across runs, seed a
small deterministic PRNG so regenerating the fixtures does not produce a noisy
diff every time.

- [ ] **Step 2: Generate them**

Run: `pnpm vite-script scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts`
Expected: three PDFs written to `public/test-data/pdf/`.

Verify the scanned one really has no text layer before trusting it:

```bash
pdftotext -q public/test-data/pdf/synthetic-scanned-no-text-layer.pdf - | wc -c
```

Expected: a value near zero. If it prints the table's text, the image
embedding did not work and the fixture is worthless for its purpose.

- [ ] **Step 3: Add tests using them**

Append to `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`:

```ts
describe("synthetic fixtures", () => {
  it("refuses a scanned document with a diagnosis", async () => {
    const bytes = await readFile(
      "public/test-data/pdf/synthetic-scanned-no-text-layer.pdf",
    );
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const geometries = [];
    for (let p = 1; p <= doc.numPages; p += 1) {
      const page = await doc.getPage(p);
      const { geometry } = await extractPageGeometry(page, p - 1);
      geometries.push(geometry);
    }
    await doc.destroy();

    const result = detectTextLayer(geometries);
    expect(result.status).toBe("no_text_layer");
  }, 30_000);

  it("reads a fully ruled table via the lattice path", async () => {
    const tables = await detectTables(
      "public/test-data/pdf/synthetic-fully-ruled-statistics.pdf",
      [1],
    );

    expect(tables[0]!.detectionMode).toBe("lattice");
    expect(tables[0]!.confidence).toBe("high");
  }, 30_000);

  it("reads accounting negatives as negative numbers", async () => {
    // The mirror image of the n (%) test: here the parentheses really do
    // mean negative, and refusing to convert would be just as wrong as
    // over-converting was in the other direction.
    const tables = await detectTables(
      "public/test-data/pdf/synthetic-financial-statement.pdf",
      [1],
    );
    const allCells = tables.flatMap((t) => t.cells.flat());

    expect(allCells.some((cell) => /^-\d/u.test(cell))).toBe(true);
  }, 30_000);
});
```

Add `detectTextLayer` and `extractPageGeometry` to that file's imports.

- [ ] **Step 4: Update the fixtures README**

Replace the "Not covered by these fixtures" section with a "Synthetic
fixtures" section documenting the three new files, what each tests, and the
fact that they are generated by
`scripts/generate-pdf-test-fixtures/` and can be regenerated.

- [ ] **Step 5: Run and commit**

```bash
pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts
git add scripts/ public/test-data/pdf/
git commit -m "test: add synthetic pdf fixtures for scanned, ruled, and financial cases"
```

---

## Task 10: Full verification

- [ ] **Step 1: Full suite**

```bash
pnpm type-check
pnpm lint
pnpm test --quick
```

Expected: all pass.

- [ ] **Step 2: Detection accuracy against the real fixtures**

Run: `pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts`

Expected: PASS. Specifically confirm each fixture exercises the path it was
committed for, because a detector that silently falls back to stream detection
on every document would still pass a loose assertion:

- `frontiers-peru-child-health-insurance.pdf` produces at least one region with
  `detectionMode: "tagged"`.
- A ruled fixture produces at least one with `detectionMode: "lattice"`.
- The borderless synthetic fixture produces `detectionMode: "stream"` with a
  visible confidence caveat.

- [ ] **Step 3: Confirm the two gate documents still behave correctly**

This phase must not regress the merge gate. Run the Phase B2 gate suite:

```bash
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts
```

Expected: PASS, unchanged. Then run detection over both gate PDFs and confirm
it returns **zero or only low-confidence regions**, and that the UI does not
present them as tables the user should import. Neither document contains a
table; a detector confidently reporting one on either is a false positive worth
investigating before merge.

- [ ] **Step 4: Manual verification**

Start the app, drag `frontiers-peru-child-health-insurance.pdf` onto the import
dropzone, and confirm: "Find tables automatically" lists regions with
confidences, each draws a box on the page preview, selecting one populates the
review grid via `extractGridTable`, and saving creates a dataset whose rows
match the PDF.

Then repeat with the scanned synthetic fixture and confirm the scanned
diagnosis appears rather than a generic failure or an empty table list.

- [ ] **Step 5: Update the spec statuses**

In `docs/superpowers/specs/2026-08-17-pdf-import-design.md`, change the status
line to `implemented`. In
`docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md`, change
`design approved, not yet implemented` to `implemented`.

- [ ] **Step 6: Commit**

```bash
git add docs/
git commit -m "docs: mark pdf import specs as implemented"
```

---

## Self-review notes

**Spec coverage.** Detection signals A, B and C map to Tasks 2, 1 and 3;
marked-content wiring to Task 4; cross-signal dedup to Task 5; multi-page
merging to Task 6; confidence scoring to Task 7; the detections-as-regions
model from the newer spec to Task 8; the fixture gaps to Task 9.

**Two deliberate deviations from the original spec**, both carried over from
the original Phase B plan and flagged where they occur:

1. **Percent handling.** The spec's diagram showed `12%` becoming `0.12`.
   Phase B1 makes it `12`, because rescaling makes an imported table disagree
   with the document the user is reading beside it.
2. **`n (%)` values.** `361 (84.7)` must survive untouched, so parentheses are
   treated as a sign only when they wrap the entire value.

**One structural change from the original plan.** Multi-page merging
(Task 6) is now a special case of the newer spec's combination rule: regions
whose resolved headers match union into one natural table. `mergePageSpans`
remains as the detector-side implementation, but B2's combination logic is what
the user actually sees, and the two must agree. If they ever disagree, B2's
rule wins, because it is the one that also governs regions the user drew.

**Known gaps carried forward, not silently dropped:**

- Text rotated *within* an upright page is still unhandled; page-level rotation
  is handled in Phase B1's `extractPageGeometry`.
- Tables of contents with dot leaders are detected as tables by the stream
  signal. They score low, but they are not specifically excluded.
- Column-count instability across pages, where a column is empty on one page,
  can still split a table that should have merged.

---
