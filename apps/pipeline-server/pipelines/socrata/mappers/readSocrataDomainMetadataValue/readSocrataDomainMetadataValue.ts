type _DomainMetadataEntry = Readonly<{ key?: unknown; value?: unknown }>;

function _readDomainMetadata(record: unknown): readonly _DomainMetadataEntry[] {
  const entries = (
    record as { classification?: { domain_metadata?: unknown } } | null
  )?.classification?.domain_metadata;
  return Array.isArray(entries) ? entries : [];
}

/**
 * The value of the first of `keys` a Socrata result's
 * `classification.domain_metadata` lists. Each portal names its custom
 * metadata differently: NYC says `Update_Update-Frequency` where the NY
 * State portals say `Dataset-Summary_Posting-Frequency`.
 *
 * @param record - A raw Discovery API result.
 * @param keys - The keys to try, in order.
 * @returns The value, or `undefined` when no key is present.
 */
export function readSocrataDomainMetadataValue(
  record: unknown,
  keys: readonly string[],
): unknown {
  const entries = _readDomainMetadata(record);
  const matched = keys
    .map((key) => {
      return entries.find((entry) => {
        return entry.key === key;
      });
    })
    .find((entry) => {
      return entry !== undefined;
    });
  return matched?.value;
}
