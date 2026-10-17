import { Player, type PlayerRef } from "@remotion/player";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useCurrentFrame } from "remotion";
import {
  AvandarStage,
  FEATURE_BEATS,
} from "../src/avandar/generated/product.js";
import "../src/avandar/generated/product.css";
import type { ProductFeature } from "../src/avandar/generated/product.js";

declare global {
  interface Window {
    /** Imperative controls the manual `component:review` harness drives from the browser console. */
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

function Scene({ feature }: { feature: ProductFeature }) {
  return (
    <AvandarStage
      feature={feature}
      frame={useCurrentFrame()}
      width={1600}
      height={840}
    />
  );
}
function Review() {
  const [feature, setFeature] = useState<ProductFeature>("explorer");
  const ref = useRef<PlayerRef>(null);
  window.review = {
    feature,
    beats: FEATURE_BEATS,
    setFeature: (value) => flushSync(() => setFeature(value)),
    seek: (frame) => ref.current?.seekTo(frame),
    frame: () => ref.current?.getCurrentFrame() ?? 0,
    play: () => ref.current?.play(),
    pause: () => ref.current?.pause(),
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
createRoot(document.getElementById("root")!).render(<Review />);
