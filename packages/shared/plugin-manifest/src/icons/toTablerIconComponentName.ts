/**
 * Converts a Tabler icon name from a manifest, such as `trending-up`, to the
 * component `@tabler/icons-react` exports for it, such as `IconTrendingUp`.
 */
export function toTablerIconComponentName(iconName: string): string {
  const pascalCaseName = iconName
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
  return `Icon${pascalCaseName}`;
}
