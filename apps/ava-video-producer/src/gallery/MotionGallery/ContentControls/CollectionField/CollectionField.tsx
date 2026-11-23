import { getStockValueFromPath } from "../../../../stock/data/getStockValueFromPath";
import { CollectionItem } from "../CollectionItem/CollectionItem";
import { AddCollectionItem } from "./AddCollectionItem/AddCollectionItem";
import styles from "./CollectionField.module.css";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";
import type { Props as ContentFieldProps } from "../ContentField/ContentField";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";

/** Bounded arrays expose collection lengths through Add and Remove only. */
export type Props = ContentFieldProps & {
  control: Extract<
    StockControl,
    {
      kind: "collection";
    }
  >;
  context: ContentFieldContext;
};
/** Collection rows use editor-only keys even when content has no ID. */
export function CollectionField(props: Readonly<Props>): ReactNode {
  const { control, context, preset, state, onChange } = props;
  const value = getStockValueFromPath({
    value: state.draft,
    path: context.path,
  });
  const items = Array.isArray(value) ? value : [];
  const keys = state.rowKeys[JSON.stringify(context.path)] ?? [];
  const label = control.label.message;
  return (
    <fieldset
      className={styles.collectionFieldCollection}
      aria-describedby={context.field["aria-describedby"]}
    >
      <legend>
        {label} ({items.length}/{control.maxItems})
      </legend>
      {items.map((item, index) => {
        return (
          <CollectionItem
            {...props}
            key={keys[index]}
            item={item}
            index={index}
            count={items.length}
          />
        );
      })}
      <AddCollectionItem
        {...{ items, control, preset, state, context, onChange, label }}
      />
    </fieldset>
  );
}
