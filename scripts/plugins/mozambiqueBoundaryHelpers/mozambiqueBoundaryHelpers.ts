/*
 * The pure steps of `buildMozambiqueBoundaries`: the simplification
 * tolerances it tries, the search for the first one that fits a file under
 * the content size limit, the CSV text it writes, and the checks it runs on
 * the boundaries before writing anything.
 */

/** The CSV text written at one tolerance, and its size in UTF-8 bytes. */
type SimplifiedCsv = { tolerance: number; csvText: string; byteSize: number };

/** A district as the boundary checks see it. */
type DistrictCodes = Readonly<{
  code: string;
  name: string;
  provinceCode: string | undefined;
}>;

/**
 * Makes the simplification tolerances, in degrees, to try in order: none
 * first, then one `stepDegrees` more each time, up to `maxDegrees`. Rounded,
 * so the steps print as written rather than as float noise.
 */
export function makeToleranceLadder(options: {
  stepDegrees: number;
  maxDegrees: number;
}): number[] {
  const { stepDegrees, maxDegrees } = options;
  const stepCount = Math.round(maxDegrees / stepDegrees);
  return Array.from({ length: stepCount + 1 }, (_value, index) => {
    return Number((index * stepDegrees).toFixed(10));
  });
}

/**
 * Finds the first tolerance whose CSV text is under `limitBytes` UTF-8 bytes,
 * trying each in order and stopping at the first that fits. Throws, naming
 * the size at the last tolerance, when none fits.
 */
export async function findSimplifyToleranceUnderLimit(options: {
  tolerances: readonly number[];
  limitBytes: number;
  makeCsvText: (tolerance: number) => Promise<string>;
}): Promise<SimplifiedCsv> {
  const { tolerances, limitBytes, makeCsvText } = options;
  const tryFrom = async (index: number): Promise<SimplifiedCsv> => {
    const tolerance = tolerances[index];
    if (tolerance === undefined) {
      throw new Error("No tolerances to try.");
    }
    const csvText = await makeCsvText(tolerance);
    const byteSize = Buffer.byteLength(csvText, "utf8");
    if (byteSize < limitBytes) {
      return { tolerance, csvText, byteSize };
    }
    if (index === tolerances.length - 1) {
      throw new Error(
        `Even at ${tolerance} degrees, the largest tolerance, the file is ${byteSize} bytes, not under ${limitBytes}.`,
      );
    }
    return tryFrom(index + 1);
  };
  return tryFrom(0);
}

function _quoteCsvField(field: string): string {
  return /[",\n\r]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/**
 * Makes RFC 4180 CSV text from a header and rows, quoting only the fields
 * that need it (a WKT geometry always does, for its commas). Ends with a
 * line break.
 */
export function makeCsvTextFromRows(options: {
  header: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}): string {
  return [options.header, ...options.rows]
    .map((row) => {
      return row.map(_quoteCsvField).join(",");
    })
    .join("\n")
    .concat("\n");
}

function _getRepeatedValues(values: readonly string[]): string[] {
  return [
    ...new Set(
      values.filter((value, index) => {
        return values.indexOf(value) !== index;
      }),
    ),
  ];
}

/**
 * Gets every reason the boundaries cannot be written: a province or district
 * code that repeats, and a district whose point on surface lies in no
 * province. Empty when the boundaries are consistent.
 */
export function getProblemsFromBoundaries(options: {
  provinceCodes: readonly string[];
  districts: readonly DistrictCodes[];
}): string[] {
  const { provinceCodes, districts } = options;
  const districtCodes = districts.map((district) => {
    return district.code;
  });
  return [
    ..._getRepeatedValues(provinceCodes).map((code) => {
      return `province code "${code}" is not unique`;
    }),
    ..._getRepeatedValues(districtCodes).map((code) => {
      return `district code "${code}" is not unique`;
    }),
    ...districts
      .filter((district) => {
        return district.provinceCode === undefined;
      })
      .map((district) => {
        return `district "${district.name}" (${district.code}) lies in no province`;
      }),
  ];
}
