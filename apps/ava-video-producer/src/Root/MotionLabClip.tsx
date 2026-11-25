import "../theme.css";
import { MotionLab } from "../compositions/MotionLab/MotionLab";
import { StarterVideoTheme } from "../compositions/StarterVideoTheme/StarterVideoTheme";
import { Clip } from "./Clip";
import type { ReactNode } from "react";

/** Renders the motion lab clip. */
export function MotionLabClip(): ReactNode {
  return (
    <StarterVideoTheme itemId="motion-lab">
      <Clip
        body={<MotionLab />}
        name="Motion vocabulary"
        kicker="Four building blocks, one visual language"
      />
    </StarterVideoTheme>
  );
}
