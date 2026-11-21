import { Text } from "../../graphics-common/Text";
import { CARD_LABEL_SIZE } from "./StaggerCards.constants";
import type { CardCompletionData } from "./StaggerCards.types";
import type { ReactNode } from "react";

type Props = CardCompletionData;

/** Renders the card content layer for StaggerCards. */
export function CardContent(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="pill" x={props.x + 239} y={props.y + 43} anchor="end">
        0{props.cardIndex + 1}
      </Text>
      <Text
        role="title"
        x={props.x + 22}
        y={props.y + 99}
        size={CARD_LABEL_SIZE}
      >
        {props.card.label}
      </Text>
      <Text role="secondary" x={props.x + 22} y={props.y + 130}>
        {props.card.detail}
      </Text>
    </>
  );
}
