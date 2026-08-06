import { useLingui } from "@lingui/react/macro";
import { Textarea } from "@mantine/core";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/** Collects a custom clarification answer. */
export function ClarificationCustomTextInput({
  value,
  onChange,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <Textarea
      placeholder={t`Describe your answer…`}
      aria-label={t`Custom clarification answer`}
      autosize
      minRows={1}
      maxRows={4}
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}
