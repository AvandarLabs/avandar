import { Text } from "@mantine/core";
import { isStringOrNumber } from "../guards";
import type { ReactNode } from "react";

type Props = {
  value: null | undefined;

  /** What we render if the value is `null`. */
  renderNullString: NonNullable<ReactNode>;

  /** What we render if the value is `null`. */
  renderUndefinedString: NonNullable<ReactNode>;
};

export function NullOrUndefinedValueItem({
  value,
  renderNullString,
  renderUndefinedString,
}: Props): JSX.Element {
  if (value === null) {
    if (isStringOrNumber(renderNullString)) {
      return (
        <Text span fs="italic">
          {renderNullString}
        </Text>
      );
    } else {
      return <>{renderNullString}</>;
    }
  }

  if (isStringOrNumber(renderUndefinedString)) {
    return (
      <Text span fs="italic">
        {renderUndefinedString}
      </Text>
    );
  }
  return <>{renderUndefinedString}</>;
}
