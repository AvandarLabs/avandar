import { isDate } from "@avandar/utils";

const objectIdentityKeys = new WeakMap<object, number>();
let numObjectKeys = 0;

/** Uses a declared ID or object identity for description rows without IDs. */
function _buildDescriptionValueIdentity(
  value: unknown,
  idKey: string | number,
): string {
  if (isDate(value)) {
    return JSON.stringify(["date", String(value.getTime())]);
  }
  if (typeof value !== "object" || value === null) {
    return JSON.stringify([
      typeof value,
      Object.is(value, -0) ? "-0" : String(value),
    ]);
  }
  const declaredId = Reflect.get(value, idKey);
  if (declaredId !== undefined && declaredId !== null) {
    return `id:${String(declaredId)}`;
  }
  let objectKey = objectIdentityKeys.get(value);
  if (objectKey === undefined) {
    objectKey = numObjectKeys++;
    objectIdentityKeys.set(value, objectKey);
  }
  return `object:${objectKey}`;
}

/**
 * Gives description array items stable keys through reordering and filtering.
 * Explicit IDs win. Objects without IDs keep reference identity, primitive
 * values keep value identity, and duplicate identities get occurrence suffixes.
 */
export function createDescriptionValueEntries<T>(
  values: readonly T[],
  idKey: string | number = "id",
): Array<{ value: T; key: string }> {
  const countsByIdentity = new Map<string, number>();
  return values.map((value) => {
    const identity = _buildDescriptionValueIdentity(value, idKey);
    const occurrence = countsByIdentity.get(identity) ?? 0;
    countsByIdentity.set(identity, occurrence + 1);
    return { value, key: JSON.stringify([identity, occurrence]) };
  });
}
