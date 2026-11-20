import { Player, type PlayerRef } from "@remotion/player";
import { useRef, useState } from "react";
// The imperative window.review.setFeature contract commits the selected
// composition before the next console seek or capture call.
// react-doctor-disable-next-line no-flush-sync
import { flushSync } from "react-dom";
import { FEATURE_BEATS } from "../../src/avandar/generated/product";
import { Scene } from "./Scene";
import type { ProductFeature } from "../../src/avandar/generated/product";
import type { ReactNode } from "react";

declare global {
  interface Window {
    /**
     * Imperative controls the manual `component:review` harness drives from the
     * browser console.
     */
    review: {
      feature: ProductFeature;
      beats: typeof FEATURE_BEATS;
      setFeature: (value: ProductFeature) => void;
      seek: (frame: number) => void;
      frame: () => number;
      play: () => void;
      pause: () => void;
    };
  }
}

/** The review player, with its controls exposed on `window.review`. */
export function Review(): ReactNode {
  const [feature, setFeature] = useState<ProductFeature>("explorer");
  const ref = useRef<PlayerRef>(null);
  window.review = {
    feature,
    beats: FEATURE_BEATS,
    setFeature: (value) => {
      return flushSync(() => {
        return setFeature(value);
      });
    },
    seek: (frame) => {
      return ref.current?.seekTo(frame);
    },
    frame: () => {
      return ref.current?.getCurrentFrame() ?? 0;
    },
    play: () => {
      return ref.current?.play();
    },
    pause: () => {
      return ref.current?.pause();
    },
  };
  return (
    <Player
      ref={ref}
      component={Scene}
      inputProps={{ feature }}
      durationInFrames={800}
      compositionWidth={1600}
      compositionHeight={840}
      fps={30}
      style={{ width: 1600, height: 840 }}
      controls={false}
    />
  );
}
