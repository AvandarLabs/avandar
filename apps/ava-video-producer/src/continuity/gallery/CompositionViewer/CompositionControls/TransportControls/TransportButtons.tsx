import type { useCompositionAppearance } from "../../useCompositionAppearance/useCompositionAppearance";
import type { ReactNode } from "react";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
/**
 * Keep playback buttons as direct transport children with their original copy.
 */
export function TransportButtons({ appearance }: Readonly<Props>): ReactNode {
  return (
    <>
      <button
        onClick={() => {
          return appearance.send("play");
        }}
      >
        Play
      </button>
      <button
        onClick={() => {
          return appearance.send("pause");
        }}
      >
        Pause
      </button>
      <button
        onClick={() => {
          return appearance.send("replay");
        }}
      >
        Replay
      </button>
    </>
  );
}
