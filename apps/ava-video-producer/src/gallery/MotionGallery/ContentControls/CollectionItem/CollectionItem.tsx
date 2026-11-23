import { ContentField } from "../ContentField/ContentField";
import styles from "./CollectionItem.module.css";
import { CollectionItemHeader } from "./CollectionItemHeader/CollectionItemHeader";
import type { Props as CollectionFieldProps } from "../CollectionField/CollectionField";
import type { ReactNode } from "react";

type Props = CollectionFieldProps & {
  item: unknown;
  index: number;
  count: number;
};
/** A surviving row retains its input state when a preceding row is removed. */
export function CollectionItem(props: Readonly<Props>): ReactNode {
  const {
    control,
    context,
    preset,
    state,
    onChange,
    index,
    item,
    count: numItems,
    itemPath: providedItemPath,
  } = props;
  const path = [...context.path, index];
  const itemPath =
    item && typeof item === "object" && !Array.isArray(item)
      ? path
      : providedItemPath;
  return (
    <div className={styles.collectionItemRow}>
      <CollectionItemHeader
        {...{
          index,
          context,
          count: numItems,
          control,
          preset,
          state,
          onChange,
        }}
      />
      {control.itemControls.map((child) => {
        return (
          <ContentField
            {...props}
            key={child.path}
            control={child}
            parentPath={path}
            itemPath={itemPath}
          />
        );
      })}
    </div>
  );
}
