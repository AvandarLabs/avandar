/**
 * Whether a dotted control path such as `beats[].token.label` or
 * `props.windows[].swap` names a field present in an authored value. A segment
 * ending in `[]` matches when any element of that array carries the rest of
 * the path.
 */
export function hasControlPath({
  value,
  path,
}: Readonly<{
  value: unknown;
  path: readonly string[];
}>): boolean {
  const [head, ...tail] = path;
  if (!head) {
    return true;
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const key = head.endsWith("[]") ? head.slice(0, -2) : head;
  const child: unknown = Reflect.get(value, key);
  return head.endsWith("[]")
    ? Array.isArray(child) &&
        child.some((item: unknown) => {
          return hasControlPath({
            value: item,
            path: tail,
          });
        })
    : key in value &&
        hasControlPath({
          value: child,
          path: tail,
        });
}
