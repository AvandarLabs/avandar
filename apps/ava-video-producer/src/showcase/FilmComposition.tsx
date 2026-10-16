import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { AvandarScene } from "../avandar/AvandarScene";
import { MotionLab } from "../compositions/MotionLab";
import { TitleStudy } from "../compositions/TitleStudy";
import { StockGraphic } from "../stock/StockGraphic";
import { absoluteCues } from "../storyboard/schema/schema";
import { StoryFilm } from "../storyboard/StoryFilm/StoryFilm";
import { TitleCard, TITLE_LEN } from "../title-card";
import type { Film } from "./showcase.types";

/** Shared picture for browser playback and serial frame rendering. */
export function FilmComposition({
  film,
  withAudio = true,
}: {
  film: Film;
  withAudio?: boolean;
}) {
  const frame = useCurrentFrame();
  if (film.kind === "stock" && film.preset) {
    return (
      <StockGraphic
        preset={film.preset}
        frame={frame}
        width={film.width}
        height={film.height}
        accent={film.accent}
        background={film.background}
      />
    );
  }
  if (film.kind === "title-study") {
    return <TitleStudy />;
  }
  if (film.kind === "motion-lab") {
    return (
      <AbsoluteFill style={{ background: "var(--ground)" }}>
        {frame < TITLE_LEN ? (
          <TitleCard
            name="Motion vocabulary"
            kicker="Four building blocks, one visual language"
            frame={frame}
          />
        ) : null}
        <Sequence from={TITLE_LEN}>
          <MotionLab />
        </Sequence>
      </AbsoluteFill>
    );
  }
  if (!film.plan) {
    throw new Error("Storyboard film requires a plan");
  }
  return (
    <>
      <StoryFilm
        plan={film.plan}
        productScene={AvandarScene}
        showCaptions={film.showCaptions}
      />
      {withAudio
        ? absoluteCues(film.plan).map((cue) =>
            cue.audio ? (
              <Sequence
                key={cue.id}
                from={cue.startFrame}
                durationInFrames={cue.endFrame - cue.startFrame}
              >
                <Audio src={staticFile(cue.audio)} />
              </Sequence>
            ) : null,
          )
        : null}
      {withAudio && film.plan.narrationTrack ? (
        <Sequence from={film.plan.narrationTrack.startFrame}>
          <Audio
            src={staticFile(film.plan.narrationTrack.src)}
            volume={film.plan.narrationTrack.volume}
          />
        </Sequence>
      ) : null}
      {withAudio
        ? film.plan.soundEffects.map((sound) => (
            <Sequence key={sound.id} from={sound.atFrame}>
              <Audio src={staticFile(sound.src)} volume={sound.volume} />
            </Sequence>
          ))
        : null}
    </>
  );
}
