// Registers the bundled faces the theme's text roles name.
import "../fonts";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TITLE_STUDY_LEN } from "../composition-timing";
import { TitleCard, TITLE_LEN } from "../TitleCard/TitleCard";
import { useVideoTokens } from "../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

export { TITLE_STUDY_LEN } from "../composition-timing";
// Three unchanged title components, with an 18-frame breath between them.
const TITLES = [
  ["Acme Studio", "Ask a question, publish the answer"],
  ["Motion vocabulary", "Small movements. Clear meaning."],
  ["Made with code", "React compositions, rendered frame by frame"],
];
/**
 * The three titles in turn on the scene ground. Draw it inside a video
 * theme: a showcase film's, or `starter` in Remotion Studio.
 */
export function TitleStudy(): ReactNode {
  const frame = useCurrentFrame();
  const tokens = useVideoTokens();
  const titleFrames = TITLE_STUDY_LEN / TITLES.length;
  const index = Math.floor(frame / titleFrames);
  const local = frame % titleFrames;
  const [name, kicker] = TITLES[index];
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      {local < TITLE_LEN ? (
        <TitleCard name={name} kicker={kicker} frame={local} />
      ) : null}
    </AbsoluteFill>
  );
}
