import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Textarea } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

export type FreeTextBodyProps = {
  placeholder: string | undefined;
  onSubmit: (text: string) => void;
};

/** Collects a free-form answer for a clarification request. */
export function FreeTextBody({
  placeholder,
  onSubmit,
}: FreeTextBodyProps): React.ReactNode {
  const [value, setValue] = useState("");
  const reference = useRef<HTMLTextAreaElement>(null);
  const { t } = useLingui();

  useEffect(() => {
    reference.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <Stack gap="xs">
      <Textarea
        ref={reference}
        placeholder={placeholder ?? t`Type your answer...`}
        autosize
        minRows={1}
        maxRows={4}
        value={value}
        onChange={(event) => {return setValue(event.currentTarget.value)}}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <Group justify="flex-end" gap="xs">
        <Button size="xs" onClick={submit} disabled={value.trim().length === 0}>
          <Trans>Send answer</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
