import { RecognitionObject } from "./RecognitionObject/RecognitionObject";
import { useRecognitionObjectsPresentation } from "./useRecognitionObjectsPresentation";
import type { Input } from "../PeerContributionRecognition.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Fixed authored objects keep named authorship beneath each visible work. */
export function RecognitionObjects(props: Readonly<Props>): ReactNode {
  const presentation = useRecognitionObjectsPresentation(props);

  return (
    <g>
      {props.input.contributions.map((item, index) => {
        return (
          <RecognitionObject
            key={item.id}
            {...presentation}
            item={item}
            index={index}
          />
        );
      })}
    </g>
  );
}
