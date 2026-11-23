import "../theme.css";
import { StarterVideoTheme } from "../compositions/StarterVideoTheme/StarterVideoTheme";
import { TitleStudy } from "../compositions/TitleStudy";
import type { ReactNode } from "react";

/** Renders the title study clip. */
export function TitleStudyClip(): ReactNode {
  return (
    <StarterVideoTheme itemId="title-study">
      <TitleStudy />
    </StarterVideoTheme>
  );
}
