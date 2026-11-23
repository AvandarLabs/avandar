import { Motion } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import { WORD_DROP } from "./WordReveal.constants";
import type { PositionedWord, Drawing } from "./WordReveal.types";
import type { ReactNode } from "react";

type Props = Drawing & { word: PositionedWord; wordIndex: number };

/** Renders the revealing word layer for WordReveal. */
export function RevealingWord(props: Readonly<Props>): ReactNode {
  return (
    <g
      key={props.word.word}
      clipPath={`url(#${props.id}-word-${props.wordIndex})`}
    >
      <g
        transform={`translate(0 ${Motion.mix({
          t: props.motion.ramp(
            props.frame,
            props.word.at,
            props.motion.rise.duration,
            props.motion.rise.easing,
          ),
          from: props.word.size * WORD_DROP,
          to: 0,
        })})`}
      >
        <Text
          role="title"
          x={props.word.x}
          y={props.word.y}
          fittedSize={props.word.size}
          fill={props.word.accented ? props.accent : props.color.text}
        >
          {props.word.word}
        </Text>
      </g>
    </g>
  );
}
