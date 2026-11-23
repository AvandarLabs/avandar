import { ContentDraftModule } from "../../ContentDraftModule/ContentDraftModule";
import type { Props as CollectionFieldProps } from "../CollectionField";
import type { ReactNode } from "react";

type Props = Pick<
  CollectionFieldProps,
  "control" | "preset" | "state" | "context" | "onChange"
> & { items: unknown[]; label: string };
/** Adds a bounded collection item through CollectionField. */
export function AddCollectionItem({
  items,
  control,
  preset,
  state,
  context,
  onChange,
  label,
}: Readonly<Props>): ReactNode {
  return (
    <button
      disabled={items.length >= control.maxItems}
      onClick={() => {
        return onChange(
          ContentDraftModule.addItem({
            preset,
            state,
            path: context.path,
            schema: control.itemSchema,
          }),
        );
      }}
    >
      Add {label} item
    </button>
  );
}
