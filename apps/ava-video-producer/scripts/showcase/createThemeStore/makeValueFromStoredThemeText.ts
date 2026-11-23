import { ThemeStoreError } from "../ThemeStoreError";
/** Parses the persisted JSON text and reports the authored theme filename. */
export function makeValueFromStoredThemeText({
  text,
  id,
}: Readonly<{ text: string; id: string }>): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ThemeStoreError(
      400,
      `themes/${id}${".theme.json"} is not valid JSON`,
    );
  }
}
