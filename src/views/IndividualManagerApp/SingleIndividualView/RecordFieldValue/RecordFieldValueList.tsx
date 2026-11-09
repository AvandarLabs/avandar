import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useId, useState } from "react";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValueList.module.css";
import type { ReactNode } from "react";

/** How many values of a list show before the rest are tucked away. */
const COLLAPSED_VALUE_COUNT = 5;

type Props = {
  /** The field's name, which names the list for assistive technology. */
  fieldName: string;
  /** At least one value; `RecordFieldValue` handles an empty list. */
  values: readonly unknown[];
  /** Reads one value as text, by the field's type. */
  formatValue: (value: unknown) => string;
};

/**
 * Every value of a list field on the record page, one per line. A list
 * longer than five starts collapsed behind a toggle, because the rail is a
 * narrow reference column and a long list would push the record's other
 * facts out of view. Rendered by `RecordFieldValue`.
 */
export function RecordFieldValueList({
  fieldName,
  values,
  formatValue,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsible = values.length > COLLAPSED_VALUE_COUNT;
  const shownValues =
    isCollapsible && !isExpanded
      ? values.slice(0, COLLAPSED_VALUE_COUNT)
      : values;
  return (
    <>
      <ul
        id={listId}
        role="list"
        aria-label={fieldName}
        className={css.valueList}
      >
        {shownValues.map((value, index) => {
          // Values repeat (the same symptom at two visits), and the list
          // only grows or shrinks at its end, so the position is the key.
          return <li key={index}>{formatValue(value)}</li>;
        })}
      </ul>
      {isCollapsible ? (
        <Button
          className={css.toggle}
          variant="subtle"
          color="neutral"
          size="compact-xs"
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded
            ? t`Show fewer`
            : plural(values.length, {
                one: "Show all # value",
                other: "Show all # values",
              })}
        </Button>
      ) : null}
    </>
  );
}
