import { describe, expect, it } from "vitest";

import {
  fingerprintsMatch,
  makePdfTableFingerprintFromTable,
} from "./pdfTableFingerprint";

const TABLE = {
  cells: [
    ["District", "Cases"],
    ["Gao", "1204"],
    ["Mopti", "987"],
  ],
  headerRows: 1,
};

describe("makePdfTableFingerprintFromTable", () => {
  it("records the headers and shape", async () => {
    const fingerprint = await makePdfTableFingerprintFromTable(TABLE);

    expect(fingerprint.headers).toEqual(["District", "Cases"]);
    expect(fingerprint.shape).toEqual([2, 2]);
    expect(fingerprint.hash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("is stable across calls", async () => {
    const a = await makePdfTableFingerprintFromTable(TABLE);
    const b = await makePdfTableFingerprintFromTable(TABLE);

    expect(a.hash).toBe(b.hash);
  });

  it("changes when a value changes", async () => {
    const a = await makePdfTableFingerprintFromTable(TABLE);
    const b = await makePdfTableFingerprintFromTable({
      ...TABLE,
      cells: [
        ["District", "Cases"],
        ["Gao", "9999"],
        ["Mopti", "987"],
      ],
    });

    expect(a.hash).not.toBe(b.hash);
  });
});

describe("fingerprintsMatch", () => {
  it("matches independently computed fingerprints of the same table", async () => {
    const original = await makePdfTableFingerprintFromTable(TABLE);
    const fresh = await makePdfTableFingerprintFromTable(TABLE);
    expect(fingerprintsMatch({ original, fresh })).toBe(true);
  });

  it("reports a mismatch when the headers change", async () => {
    // This is the drift the whole mechanism exists to catch: a re-parse
    // resolving the same geometry to a different table.
    const original = await makePdfTableFingerprintFromTable(TABLE);
    const drifted = await makePdfTableFingerprintFromTable({
      cells: [
        ["Region", "Total"],
        ["Gao", "1204"],
        ["Mopti", "987"],
      ],
      headerRows: 1,
    });

    expect(fingerprintsMatch({ original: original, fresh: drifted })).toBe(
      false,
    );
  });

  it("reports a mismatch when the row count changes", async () => {
    const original = await makePdfTableFingerprintFromTable(TABLE);
    const truncated = await makePdfTableFingerprintFromTable({
      cells: [
        ["District", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(fingerprintsMatch({ original: original, fresh: truncated })).toBe(
      false,
    );
  });
});
