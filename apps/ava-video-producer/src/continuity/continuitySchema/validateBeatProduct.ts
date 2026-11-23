import type { ContinuityBeat } from "./continuitySchema";
/** Check product timing and aperture origins. */
export function validateBeatProduct({
  beat,
  issue,
}: Readonly<{ beat: ContinuityBeat; issue: (message: string) => void }>): void {
  if (beat.transition.kind === "aperture" && !beat.transition.origin) {
    issue("Apertures require an authored stage origin");
  }
  if (beat.content.kind === "product" || beat.content.kind === "composite") {
    if (
      beat.content.annotations?.some((cue) => {
        return cue.until >= beat.duration;
      })
    ) {
      issue("Product notation must finish within its beat");
    }
    const segment = beat.content.segment;
    if (segment.leadIn + segment.toFrame - segment.fromFrame >= beat.duration) {
      issue("Product beat must reach its declared final state");
    }
  }
}
