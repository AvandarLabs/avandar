import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/** The fixed value every row from this layout's datasets gets. */
export function ConstantInput({ value, onChange }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <TextInput
      size="xs"
      label={t`Value`}
      description={t`Every row from these datasets gets this value.`}
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}
