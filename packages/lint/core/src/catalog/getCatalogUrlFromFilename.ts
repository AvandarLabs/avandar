/**
 * Resolves catalog assets in source and packed installs. Called by
 * loadRuleCatalog and validateRuleCatalog for their data and schema files.
 */
export function getCatalogUrlFromFilename(filename: string): URL {
  return new URL(
    import.meta.url.endsWith("/src/catalog/getCatalogUrlFromFilename.ts")
      ? `../../../${filename}`
      : `./${filename}`,
    import.meta.url,
  );
}
