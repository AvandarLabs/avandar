import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadPdfDocument } from "./loadPdfDocument";

const FIXTURE =
  "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf";

describe("loadPdfDocument", () => {
  it("opens a real PDF and reports its page count", async () => {
    const bytes = await readFile(FIXTURE);
    const doc = await loadPdfDocument(new Uint8Array(bytes));

    expect(doc.numPages).toBe(10);

    await doc.destroy();
  });

  it("reports whether the document carries a structure tree", async () => {
    // The Frontiers paper is our only tagged fixture. If this ever starts
    // returning false, the tagged-detection tests are silently testing
    // nothing.
    const bytes = await readFile(FIXTURE);
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const page = await doc.getPage(1);
    const structTree = await page.getStructTree();

    expect(structTree).not.toBeNull();

    await doc.destroy();
  });
});
