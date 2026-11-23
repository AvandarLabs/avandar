import { useCurrentFrame } from "remotion";
import { match } from "ts-pattern";
import { TitleStudy } from "../../compositions/TitleStudy";
import { StockGraphic } from "../../stock/StockGraphic/StockGraphic";
import { MotionLabPicture } from "./MotionLabPicture";
import { StoryboardFilmPicture } from "./StoryboardFilmPicture";
import type { Film } from "../showcase.types";
import type { ReactNode } from "react";

type Props = Readonly<{ film: Film; withAudio?: boolean }>;
/** The film's picture, drawn inside its theme by FilmComposition. */
export function FilmPicture({ film, withAudio = true }: Props): ReactNode {
  const frame = useCurrentFrame();
  return match(film)
    .with({ kind: "stock" }, (matchedFilm) => {
      return matchedFilm.preset ? (
        <StockGraphic
          {...matchedFilm}
          frame={frame}
          width={matchedFilm.width}
          height={matchedFilm.height}
        />
      ) : (
        <StoryboardFilmPicture film={matchedFilm} withAudio={withAudio} />
      );
    })
    .with({ kind: "title-study" }, () => {
      return <TitleStudy />;
    })
    .with({ kind: "motion-lab" }, () => {
      return <MotionLabPicture frame={frame} />;
    })
    .with({ kind: "storyboard" }, { kind: "helper" }, (matchedFilm) => {
      return <StoryboardFilmPicture film={matchedFilm} withAudio={withAudio} />;
    })
    .exhaustive();
}
