import { describe, expect, it } from "vitest";
import {
  computePdfTableFingerprint,
  fingerprintsMatch,
} from "./pdfTableFingerprint";

const TABLE = {
  cells: [
    ["District", "Cases"],
    ["Gao", "1204"],
    ["Mopti", "987"],
  ],
  headerRows: 1,
};

describe("computePdfTableFingerprint", () => {
  it("records the headers and shape", async () => {
    const fingerprint = await computePdfTableFingerprint(TABLE);

    expect(fingerprint.headers).toEqual(["District", "Cases"]);
    expect(fingerprint.shape).toEqual([2, 2]);
    expect(fingerprint.hash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("is stable across calls", async () => {
    const a = await computePdfTableFingerprint(TABLE);
    const b = await computePdfTableFingerprint(TABLE);

    expect(a.hash).toBe(b.hash);
  });

  it("changes when a value changes", async () => {
    const a = await computePdfTableFingerprint(TABLE);
    const b = await computePdfTableFingerprint({
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
  it("matches a fingerprint against itself", async () => {
    const fingerprint = await computePdfTableFingerprint(TABLE);
    expect(fingerprintsMatch(fingerprint, fingerprint)).toBe(true);
  });

  it("reports a mismatch when the headers change", async () => {
    // This is the drift the whole mechanism exists to catch: a re-parse
    // resolving the same geometry to a different table.
    const original = await computePdfTableFingerprint(TABLE);
    const drifted = await computePdfTableFingerprint({
      cells: [
        ["Region", "Total"],
        ["Gao", "1204"],
        ["Mopti", "987"],
      ],
      headerRows: 1,
    });

    expect(fingerprintsMatch(original, drifted)).toBe(false);
  });

  it("reports a mismatch when the row count changes", async () => {
    const original = await computePdfTableFingerprint(TABLE);
    const truncated = await computePdfTableFingerprint({
      cells: [
        ["District", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(fingerprintsMatch(original, truncated)).toBe(false);
  });
});
