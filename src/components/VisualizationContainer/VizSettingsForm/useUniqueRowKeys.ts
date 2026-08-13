import { useMemo } from "react";

/**
 * Turn per-row identity strings into list keys that are unique within the
 * list, for rows whose data carries no identifier of its own (e.g. the series
 * arrays in a viz config, which are persisted as plain objects).
 *
 * A row's key follows its content rather than its position, so removing or
 * reordering rows keeps each remaining row mounted on its own data. Repeats of
 * the same identity string get an occurrence suffix, since two rows may
 * legitimately describe the same thing.
 *
 * @param rowIdentities One identity string per row, in list order. Build it
 * from the fields that define what the row *is*, not from fields the row's
 * inputs edit freely, otherwise editing remounts the row.
 * @returns One unique key per row, in list order.
 */
export function useUniqueRowKeys(rowIdentities: readonly string[]): string[] {
  return useMemo(() => {
    const countsByIdentity = new Map<string, number>();
    return rowIdentities.map((identity) => {
      const seenCount = countsByIdentity.get(identity) ?? 0;
      countsByIdentity.set(identity, seenCount + 1);
      return seenCount === 0 ? identity : `${identity}#${seenCount}`;
    });
  }, [rowIdentities]);
}
