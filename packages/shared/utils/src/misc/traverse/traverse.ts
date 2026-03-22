/**
 * Traverses an unknown value of any type and calls the provided callback for
 * every node that is visited.
 *
 * When traversing objects, the `callback` will be called only with values, not
 * with property keys.
 *
 * Maps are a special exception because the Map keys can also be objects.
 * So for each Map entry we will traverse both the key and the value, meaning
 * the `callback` will also be called on Map keys.
 *
 * @param value - The value to traverse.
 * @param callback - The callback to call for each node.
 */
export function traverse(
  value: unknown,
  callback: (node: unknown) => void,
): void {
  const visited = new WeakSet<object>();

  function _traverse(node: unknown): void {
    if (typeof node === "object" && node !== null && visited.has(node)) {
      return;
    }

    callback(node);

    if (typeof node !== "object" || node === null || node instanceof Date) {
      return;
    }

    visited.add(node);

    if (node instanceof Map) {
      node.forEach((mapValue, mapKey) => {
        _traverse(mapKey);
        _traverse(mapValue);
      });
    } else if (node instanceof Set || Array.isArray(node)) {
      node.forEach((val) => {
        _traverse(val);
      });
    } else {
      Object.keys(node).forEach((key) => {
        const valueAtKey = node[key as keyof typeof node];
        _traverse(valueAtKey);
      });
    }
  }

  _traverse(value);
}
