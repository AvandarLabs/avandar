import { SharedElement } from "../../motion-components/SharedElement";
import { ContinuityBoxOutline } from "../ContinuityBoxOutline/ContinuityBoxOutline";
import css from "./ContinuityToken.module.css";
import { useContinuityToken } from "./useContinuityToken";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = { plan: ContinuityPlan; frame: number };
/** Carry one persistent object across a scene boundary with themed fades. */
export function ContinuityToken({ plan, frame }: Readonly<Props>): ReactNode {
  const sampledToken = useContinuityToken({ plan, frame });
  if (!sampledToken) {
    return null;
  }
  const { beat, token, source, destination, at, progress, style } =
    sampledToken;

  return (
    <SharedElement
      source={source}
      target={destination}
      frame={frame}
      at={at}
      durationInFrames={Math.max(1, beat.transition.frames)}
      motion={beat.transition.motion}
      className={css.continuityToken}
      style={style}
    >
      <ContinuityBoxOutline />
      <span
        style={{
          opacity: token.appearance === "outline" ? 1 - progress : 1,
        }}
      >
        {token.label}
      </span>
    </SharedElement>
  );
}
