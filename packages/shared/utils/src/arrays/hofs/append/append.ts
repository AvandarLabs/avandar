import { Simplify } from "type-fest";
import { isArray } from "@utils/guards/isArray/isArray.ts";
import { UnknownArray } from "@utils/index.ts";

type ItemTypeError<SeedType, ExpectedType> = {
  error: "ItemTypeError";
  message: "Invalid item type passed to `append`";
  receivedType: SeedType;
  expectedType: ExpectedType;
};

/**
 * Returns a function that appends elements to an array.
 *
 * @param elements Single item or array of items to append.
 * @returns A function that takes an array and returns it with elements
 * appended.
 */
export function append<SeedItemType>(
  elements: SeedItemType[] | SeedItemType,
): <
  T extends UnknownArray,
  ItemType extends SeedItemType extends T[number] ? SeedItemType
  : ItemTypeError<SeedItemType, T[number]>,
  ReturnType extends ItemType extends ItemTypeError<SeedItemType, T[number]> ?
    Simplify<ItemTypeError<SeedItemType, T[number]>>
  : T,
>(
  array: T,
) => ReturnType {
  return <
    T extends UnknownArray,
    ValidatedItemType extends SeedItemType extends T[number] ? SeedItemType
    : ItemTypeError<SeedItemType, T[number]>,
    ReturnType extends ValidatedItemType extends (
      ItemTypeError<SeedItemType, T[number]>
    ) ?
      Simplify<ItemTypeError<SeedItemType, T[number]>>
    : T,
  >(
    array: T,
  ) => {
    const elementsToAppend = isArray(elements) ? elements : [elements];
    return [...array, ...elementsToAppend] as unknown as ReturnType;
  };
}
