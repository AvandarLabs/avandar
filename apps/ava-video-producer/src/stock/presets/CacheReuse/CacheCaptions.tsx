import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** Phase captions name the exact miss, storage, and local-hit route. */
export function CacheCaptions({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const caption =
    frame < 68
      ? input.pathLabels.miss
      : frame < 102
        ? input.pathLabels.store
        : input.pathLabels.hit;
  return (
    <g>
      <FitText
        text={input.request.label}
        x={40}
        y={64}
        width={880}
        fontSize={24}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      {input.showPathLabels ? (
        <FitText
          text={caption}
          x={40}
          y={390}
          width={310}
          fontSize={16}
          maxLines={3}
          normalizeWhitespace
          breakLongWords
          color={accent}
        />
      ) : undefined}
    </g>
  );
}
