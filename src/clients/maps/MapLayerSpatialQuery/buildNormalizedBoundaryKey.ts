/** Builds the canonical SQL key used for normalized boundary-name matching. */
export function buildNormalizedBoundaryKey(valueExpression: string): string {
  const unicodeNormalized = `nfc_normalize(CAST(${valueExpression} AS VARCHAR))`;
  const folded = `lower(strip_accents(${unicodeNormalized}))`;
  const punctuationAsSpace = `regexp_replace(${folded}, '[^a-z0-9]+', ' ', 'g')`;
  return `trim(regexp_replace(${punctuationAsSpace}, '\\s+', ' ', 'g'))`;
}
