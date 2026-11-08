/**
 * A period is labelled for its length in the reader's language, and always
 * as the calendar day it starts on, whatever the reader's time zone.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useBucketPeriodFormatter } from "@/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter";
import { renderHook, TestProviders } from "@/test-utils";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

function _label(
  bucketGrain: ConceptAttribute.BucketGrain,
  bucket: string,
): string {
  const { result } = renderHook(
    () => {
      return useBucketPeriodFormatter(bucketGrain);
    },
    { wrapper: TestProviders },
  );
  return result.current(bucket);
}

describe("useBucketPeriodFormatter", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    // West of UTC is where a UTC-midnight date slips to the day before.
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }
  });

  it.each([
    ["day", "2026-01-05", "Jan 5, 2026"],
    ["week", "2026-01-05", "Week of Jan 5, 2026"],
    ["month", "2026-01-01", "Jan 2026"],
    ["quarter", "2026-04-01", "Q2 2026"],
    ["year", "2026-01-01", "2026"],
  ] as const)(
    "labels a %s that starts on %s as %s",
    (bucketGrain, bucket, label) => {
      expect(_label(bucketGrain, bucket)).toBe(label);
    },
  );
});
