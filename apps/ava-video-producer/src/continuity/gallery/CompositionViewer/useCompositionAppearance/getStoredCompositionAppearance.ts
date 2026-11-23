import { continuityAppearanceSchema } from "../../../continuityAppearance/continuityAppearance";
import type { ContinuityAppearance } from "../../../continuityAppearance/continuityAppearance";
/** Read validated appearance preferences with the original schema defaults. */
export function getStoredCompositionAppearance(): ContinuityAppearance {
  try {
    return continuityAppearanceSchema.parse(
      JSON.parse(localStorage.getItem("composition-appearance:v2") ?? "{}"),
    );
  } catch {
    return continuityAppearanceSchema.parse({});
  }
}
