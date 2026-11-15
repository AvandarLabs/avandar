import { useMemo } from "react";
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
import { createContinuityPlanFromVideoThemeSnapshot } from "../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { StockGraphic } from "../stock/StockGraphic";
import { absoluteCues } from "../storyboard/schema/schema";
import { StoryFilm } from "../storyboard/StoryFilm/StoryFilm";
import { TitleCard, TITLE_LEN } from "../title-card";
import { VideoThemeProvider } from "../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createVideoThemeSourceFromSnapshot } from "../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { Film } from "./showcase.types";

/** The film's picture, drawn inside its theme by `FilmComposition`. */
function FilmPicture({
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
        {...film}
        frame={frame}
        width={film.width}
        height={film.height}
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

/**
 * Shared picture for browser playback and serial frame rendering, themed
 * by the film's snapshot with the film id as its override scope. A stock
 * graphic or continuity beat inside adds its own nested scope.
 */
export function FilmComposition({
  film,
  withAudio = true,
}: {
  film: Film;
  withAudio?: boolean;
}) {
  // The picture and its audio cues follow the themed plan, the same plan the
  // film's frame count came from.
  const themedFilm = useMemo(
    () =>
      film.plan
        ? {
            ...film,
            plan: createContinuityPlanFromVideoThemeSnapshot(
              film.plan,
              film.theme,
              [film.id],
            ),
          }
        : film,
    [film],
  );
  return (
    <VideoThemeProvider
      source={createVideoThemeSourceFromSnapshot(film.theme, [film.id])}
    >
      <FilmPicture film={themedFilm} withAudio={withAudio} />
    </VideoThemeProvider>
  );
}
