import type { Drawing } from "./WordReveal.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the word masks layer for WordReveal. */
export function WordMasks(props: Readonly<Props>): ReactNode {
  return (
    <defs>
      {props.words.map((word, wordIndex) => {
        return (
          <clipPath id={`${props.id}-word-${wordIndex}`} key={word.word}>
            <rect
              x={word.x - 2}
              y={word.y - word.size}
              width={word.width}
              height={word.size + 8}
            />
          </clipPath>
        );
      })}
    </defs>
  );
}
