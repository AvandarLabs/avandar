import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import "../theme.css";
import { TITLE_LEN, TitleCard } from "../TitleCard/TitleCard";
import { useVideoTokens } from "../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

/**
 * Title card, then the flow.
 *
 * The body is wrapped in a Sequence rather than retimed. Every click beat
 * and pointer keyframe inside a composition is an absolute frame number,
 * and shifting sixty of them by hand is how a cursor ends up clicking six
 * frames after the button it was aiming at. Inside the Sequence the body
 * still sees its own frame 0 where it always did, so none of those frame
 * numbers need to shift.
 *
 * Both layers sit on the same dark ground, so the handover is a dissolve
 * between two states of one field rather than a cut between two lit frames,
 * and the last frame matches frame 0, which is what keeps the loop seam
 * from strobing every time the tile repeats. The ground is the scene
 * palette's, so render it inside a video theme.
 */
export function Clip({
  body,
  name,
  kicker,
}: Readonly<{
  body: ReactNode;
  name: string;
  kicker: string;
}>): ReactNode {
  const frame = useCurrentFrame();
  const tokens = useVideoTokens();
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      {frame < TITLE_LEN ? (
        <TitleCard name={name} kicker={kicker} frame={frame} />
      ) : null}
      <Sequence from={TITLE_LEN}>{body}</Sequence>
    </AbsoluteFill>
  );
}
