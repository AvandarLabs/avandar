import type { ContinuityBeat } from "./continuitySchema";
/** Check composite cue ordering and reading holds. */
export function validateBeatDiagrams({
  beat,
  issue,
}: Readonly<{ beat: ContinuityBeat; issue: (message: string) => void }>): void {
  if (beat.content.kind === "composite") {
    const { diagrams, signalAt } = beat.content;
    if (
      diagrams.some((diagram) => {
        return diagram.overlay.until >= beat.duration;
      })
    ) {
      issue("Floating explanations must finish within their beat");
    }
    if (
      diagrams[0].at !== 0 ||
      diagrams.some((diagram, position) => {
        return (
          diagram.at >= beat.duration ||
          (position > 0 && diagram.at <= diagrams[position - 1].at)
        );
      })
    ) {
      issue("Diagram cues must start at zero and increase within the beat");
    }
    if (signalAt + 45 >= beat.duration) {
      issue("Causal signal needs a result hold");
    }
  }
}
