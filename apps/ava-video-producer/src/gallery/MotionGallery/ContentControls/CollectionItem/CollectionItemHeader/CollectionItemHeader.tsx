import { ContentDraftModule } from "../../ContentDraftModule/ContentDraftModule";
import css from "./CollectionItemHeader.module.css";
import type { Props as CollectionFieldProps } from "../../CollectionField/CollectionField";
import type { ReactNode } from "react";

type Props = Pick<
  CollectionFieldProps,
  "control" | "preset" | "state" | "context" | "onChange"
> & { index: number; count: number };
/** Names and removes one editor row for CollectionItem. */
export function CollectionItemHeader({
  index,
  context,
  count,
  control,
  preset,
  state,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.collectionItemHeaderCollectionItemRowHeader}>
      <span>Item {index + 1}</span>
      <button
        aria-label={`Remove ${context.label} item ${index + 1}`}
        disabled={count <= control.minItems}
        onClick={() => {
          return onChange(
            ContentDraftModule.removeItem({
              preset,
              state,
              path: context.path,
              index,
            }),
          );
        }}
      >
        Remove
      </button>
    </div>
  );
}
