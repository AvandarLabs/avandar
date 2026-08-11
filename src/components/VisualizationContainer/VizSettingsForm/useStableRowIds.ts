import { useRef } from "react";

/**
 * Assign a stable render id to each item of a list whose items carry no
 * identifier of their own (e.g. the series arrays in a viz config, which are
 * persisted as plain objects).
 *
 * Ids are tracked by object identity, so an item keeps its id as the list is
 * appended to, reordered, or filtered. Editing a row replaces its object with
 * a new one at the same index, so an unseen object inherits the id previously
 * held at its index whenever the list length is unchanged: that keeps a row's
 * inputs mounted (and focused) across edits.
 *
 * @param items The list to identify. Item objects must not be mutated in
 * place, otherwise two rows can end up sharing one id.
 * @returns One id per item, in list order.
 */
export function useStableRowIds(items: readonly object[]): string[] {
  const idsByItem = useRef(new WeakMap<object, string>()).current;
  const previousIds = useRef<string[]>([]);
  const nextIdNumber = useRef(0);

  const ids = items.map((item, idx) => {
    const knownId = idsByItem.get(item);
    if (knownId !== undefined) {
      return knownId;
    }

    const inheritedId =
      items.length === previousIds.current.length ?
        previousIds.current[idx]
      : undefined;
    const id = inheritedId ?? `row-${nextIdNumber.current++}`;
    idsByItem.set(item, id);
    return id;
  });

  previousIds.current = ids;
  return ids;
}
