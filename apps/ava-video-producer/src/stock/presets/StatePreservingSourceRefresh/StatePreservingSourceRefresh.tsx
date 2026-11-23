import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { RefreshRecord } from "./RefreshRecord/RefreshRecord";
import { RefreshWriteCount } from "./RefreshWriteCount";
import { useStatePreservingSourceRefreshPresentation } from "./useStatePreservingSourceRefreshPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };

/** One source refresh preserves identities and every human-owned field. */
export function StatePreservingSourceRefresh(
  props: Readonly<Props>,
): ReactNode {
  const presentation = useStatePreservingSourceRefreshPresentation(props);

  return (
    <g>
      <LabelSlots
        labels={[
          [props.input.copy.context, 50, 580, 850, 14, 1],
          [
            props.frame >= 140
              ? props.input.copy.after
              : props.input.copy.before,
            50,
            30,
            850,
            14,
            1,
          ],
          [props.input.labels.derived, 220, 58, 350, 14, 3],
          [props.input.labels.human, 610, 58, 290, 14, 3],
        ]}
      />
      {props.input.records.map((record, index) => {
        return (
          <RefreshRecord
            key={record.id}
            input={props.input}
            record={record}
            index={index}
            frame={props.frame}
            accent={props.accent}
          />
        );
      })}
      {props.input.showWriteCount ? (
        <RefreshWriteCount {...presentation} />
      ) : null}
    </g>
  );
}
