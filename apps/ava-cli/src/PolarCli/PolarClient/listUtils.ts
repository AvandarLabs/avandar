type ListPageWithResult<TItem> = Readonly<{
  result: Readonly<{
    items: readonly TItem[];
  }>;
}>;

type ListPageWithOk<TItem> =
  | Readonly<{
      ok: true;
      value: Readonly<{
        items: readonly TItem[];
      }>;
    }>
  | Readonly<{
      ok: false;
      error: unknown;
    }>;

/**
 * Extracts the `items` array from a paginated API list page response.
 *
 * Supports both the `{ result: { items: [...] } }` and
 * `{ ok: true, value: { items: [...] } } | { ok: false, error }` shapes.
 *
 * Returns an empty array if the input is not a recognized page shape.
 *
 * @param page The response page returned by the Polar API client.
 * @returns An array of items of type `TItem`.
 */
export function getItemsFromListPage<TItem>(page: unknown): readonly TItem[] {
  if (typeof page !== "object" || page === null) {
    return [];
  }

  if ("result" in page) {
    const typed = page as ListPageWithResult<TItem>;
    return typed.result.items ?? [];
  }

  if ("ok" in page) {
    const typed = page as ListPageWithOk<TItem>;
    if (typed.ok) {
      return typed.value.items ?? [];
    }
    return [];
  }

  return [];
}
