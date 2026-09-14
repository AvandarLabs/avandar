import { matchLiteral } from "@avandar/utils";
import { TextInput } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  testId: string;
  value: string | number | boolean;
  placeholder: string;
  ariaLabel: string;
  /** The filtered column's type, which decides the input's own presentation. */
  dataType: AvaDataTypeNs.T | undefined;
  className: string;
  onValueChange: (nextValueText: string) => void;
  onCommit: () => void;
};

/**
 * The native input type for a temporal column. Takes only the temporal types:
 * every other column renders as a plain text field, so there is no input type
 * to pick.
 */
function _getInputTypeFromTemporalDataType(
  dataType: "date" | "time" | "timestamp",
): string {
  return matchLiteral(dataType, {
    date: "date",
    time: "time",
    timestamp: "datetime-local",
  });
}

/** Single text or temporal input used by scalar and between filter editors. */
export function FilterScalarInput({
  testId,
  value,
  placeholder,
  ariaLabel,
  dataType,
  className,
  onValueChange,
  onCommit,
}: Props): ReactNode {
  // A date column gets a real date picker; a numeric column keeps a text field
  // but asks for the numeric keyboard on touch devices.
  const inputType =
    dataType !== undefined && AvaDataType.isTemporal(dataType)
      ? _getInputTypeFromTemporalDataType(dataType)
      : undefined;
  const isNumeric = dataType !== undefined && AvaDataType.isNumeric(dataType);

  return (
    <TextInput
      size="sm"
      data-testid={testId}
      aria-label={ariaLabel}
      type={inputType ?? "text"}
      inputMode={isNumeric && inputType === undefined ? "numeric" : undefined}
      placeholder={inputType === undefined ? placeholder : undefined}
      value={String(value)}
      onChange={(event) => {
        onValueChange(event.currentTarget.value);
      }}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onCommit();
        }
      }}
      className={className}
    />
  );
}
