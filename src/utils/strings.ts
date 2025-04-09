export function stringComparator(a: string, b: string): number {
  return a.localeCompare(b);
}

export function sortStrings(strings: readonly string[]): string[] {
  return [...strings].sort(stringComparator);
}

export function camelToTitleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}
