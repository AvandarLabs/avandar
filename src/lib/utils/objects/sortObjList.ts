import { isNullOrUndefined, isNumber, isString } from "../guards";
import { stringComparator } from "../strings";

/**
 * Compares two values of string or number types.
 * Also handles nulls and undefineds.
 *
 * @param a The first value to compare.
 * @param b The second value to compare.
 * @param options The options for the comparator.
 * @param options.nullOrUndefinedSortOrder The order to sort null or undefined
 * values. Defaults to "last".
 * @returns A number indicating the order of the values.
 */
export function mixedComparator(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  {
    nullOrUndefinedSortOrder = "last",
  }: {
    nullOrUndefinedSortOrder?: "last" | "first";
  },
): number {
  // handle nullish values
  if (isNullOrUndefined(a) && isNullOrUndefined(b)) {
    return 0;
  }
  if (isNullOrUndefined(a)) {
    return nullOrUndefinedSortOrder === "last" ? 1 : -1;
  }
  if (isNullOrUndefined(b)) {
    return nullOrUndefinedSortOrder === "last" ? -1 : 1;
  }

  // handle values are strings
  if (isString(a) && isString(b)) {
    return stringComparator(a, b);
  }

  // handle values are numbers
  if (isNumber(a) && isNumber(b)) {
    return a - b;
  }

  // handle values are a mix of strings and numbers
  if (isString(a) && isNumber(b)) {
    return stringComparator(a, String(b));
  }
  if (isString(b) && isNumber(a)) {
    return stringComparator(b, String(a));
  }

  return 0;
}

/**
 * Sorts a list of objects using an extractor function to pull a sortable
 * value from each object.
 * @param options The options for sorting.
 * @param options.list The list of objects to sort.
 * @param options.valueFn A function that returns the value to sort by.
 * @param options.comparator A comparator function to use for sorting. If no
 * function is passed, the default `mixedComparator` will be used.
 * @param options.nullOrUndefinedSortOrder The order to sort null or undefined
 * values. Defaults to "last". If a `comparator` function is passed, this option
 * will be ignored.
 * @returns The sorted list of objects.
 */
export function sortObjList<
  T extends object,
  SortValue extends string | number,
>(options: {
  list: readonly T[];
  sortBy: (obj: T) => SortValue;
  comparator?: (a: SortValue, b: SortValue) => number;
  nullOrUndefinedSortOrder?: "last" | "first";
}): T[] {
  const {
    list,
    sortBy: valueFn,
    comparator = (a, b) => {
      return mixedComparator(a, b, {
        nullOrUndefinedSortOrder: options.nullOrUndefinedSortOrder,
      });
    },
  } = options;

  return [...list].sort((a, b) => {
    return comparator(valueFn(a) as SortValue, valueFn(b) as SortValue);
  });
}
