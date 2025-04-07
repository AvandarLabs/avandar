import * as R from "remeda";

export function stringComparator(a: string, b: string): number {
  return a.localeCompare(b);
}

export function sortStrings(strings: readonly string[]): string[] {
  return R.sort(strings, stringComparator);
}
