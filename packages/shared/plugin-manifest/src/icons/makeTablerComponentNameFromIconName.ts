/**
 * Makes the `@tabler/icons-react` component name for a manifest icon name,
 * so the host can find the icon component a plugin asked for. For example,
 * `trending-up` becomes `IconTrendingUp`.
 */
export function makeTablerComponentNameFromIconName(iconName: string): string {
  const pascalCaseName = iconName
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
  return `Icon${pascalCaseName}`;
}
