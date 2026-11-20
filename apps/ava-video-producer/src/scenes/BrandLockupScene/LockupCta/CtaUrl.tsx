import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { StageTheme } from "../../StageTheme/StageTheme";
import { LockupCtaShared } from "./LockupCtaShared/LockupCtaShared";
import type {
  CtaLineBox,
  CtaBeats,
} from "./LockupCtaShared/LockupCtaShared.types";
import type { ReactNode } from "react";

type Props = { frame: number; box: CtaLineBox; beats: CtaBeats; url: string };
/** Reveals the lockup's URL beneath its subtitle. */
export function CtaUrl({ frame, box, beats, url }: Readonly<Props>): ReactNode {
  const badge = useVideoTheme().semantic.text.stage.badge;
  const motion = useVideoMotion();
  return (
    <div
      style={{
        ...LockupCtaShared.buildCtaLineStyle({
          box,
          top: 0.54,
          fontSize: box.height * 0.09,
        }),
        ...StageTheme.getStageTextStyle({
          role: badge,
          fields: ["fontWeight"],
        }),
        ...motion.enter(frame, beats.urlAt, { y: 0 }),
      }}
    >
      {url}
    </div>
  );
}
