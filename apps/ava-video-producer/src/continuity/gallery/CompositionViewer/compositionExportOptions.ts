import type { ContinuityAppearance } from "../../continuityAppearance";

/**
 * Options an export may carry. Continuity studies send their full
 * appearance; scene studies send only the caption choice, because palette,
 * camera, blur, annotation and roughness settings do not reach plain
 * storyboard scenes.
 */
export type CompositionExportOptions =
  | ContinuityAppearance
  | Pick<ContinuityAppearance, "captions">;

/**
 * The options a download may use, or undefined until the active player has
 * acknowledged them. A continuity player must echo the whole draft; a scene
 * player only has to answer for its own id.
 */
export function getExportOptionsFromAcknowledgement(options: {
  id: string;
  isScene: boolean;
  draft: ContinuityAppearance;
  acknowledged: { id: string; options: ContinuityAppearance } | undefined;
}): CompositionExportOptions | undefined {
  const { id, isScene, draft, acknowledged } = options;
  if (acknowledged?.id !== id) {
    return undefined;
  }
  if (isScene) {
    return { captions: acknowledged.options.captions };
  }
  return JSON.stringify(acknowledged.options) === JSON.stringify(draft)
    ? acknowledged.options
    : undefined;
}
