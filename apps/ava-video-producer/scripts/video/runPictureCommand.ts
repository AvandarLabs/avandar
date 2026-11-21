import { ContinuityThemePlans } from "../../src/continuity/ContinuityThemePlans/ContinuityThemePlans";
import { loadVideoThemeSnapshot } from "../videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
import { preview } from "./preview/preview";
import { render } from "./render/render";
import type { Storyboard } from "../../src/storyboard/schema/schema";
import type { Options } from "./video.types";
/**
 * Runs `preview` or `render`, the two commands that draw a picture and so
 * load a theme. Its camera preset can lengthen beats, so the stills, the
 * audio mix, and the gates use the themed plan. The composition themes it
 * again, which changes nothing.
 */
export async function runPictureCommand({
  options,
  plan,
  workspace,
}: Readonly<{
  options: Options;
  plan: Storyboard;
  workspace: string;
}>): Promise<void> {
  const theme = await loadVideoThemeSnapshot({
    request: { id: options.theme ?? "classic" },
  });
  const themedPlan = ContinuityThemePlans.fromVideoThemeSnapshot({
    plan,
    snapshot: theme,
    overrideIds: [plan.id],
  });
  if (options.command === "preview") {
    console.log(
      "Inspect preview:",
      await preview({
        plan: themedPlan,
        filename: options.filename,
        workspace,
        theme,
      }),
    );
  } else {
    console.log(
      "Finished video:",
      await render({
        plan: themedPlan,
        filename: options.filename,
        workspace,
        theme,
      }),
    );
  }
}
