import type { getSeedSceneFromFrame } from "../getSeedSceneFromFrame";
import type { Input } from "../SavedSeedSeasonReturn.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  values: number[];
  names: string[];
};

/**
 * Returns seed balance names and values for the current frame for
 * `SeedBalanceCaptions`.
 */
export function getSeedBalanceCaptionsLayout({
  input,
  scene,
  frame,
}: Readonly<Options>): Presentation {
  const labels = input.balanceLabels;
  const values = [
    frame < 12 ? scene.harvest : scene.current,
    frame < 12
      ? 0
      : !scene.hasCompletedSowing
        ? scene.reserve - (frame >= 100 ? scene.loss : 0)
        : scene.remaining,
    frame < 100 ? 0 : scene.loss,
    scene.hasCompletedSowing ? scene.sown : 0,
  ];
  const names = [
    frame < 12 ? input.crop.label : labels.currentUse,
    !scene.hasCompletedSowing ? labels.reserved : labels.remaining,
    labels.storageLoss,
    labels.sown,
  ];
  return { input, values, names };
}
