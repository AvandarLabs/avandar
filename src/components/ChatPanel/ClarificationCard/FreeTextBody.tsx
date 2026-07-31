import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Textarea } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

type Props = {
  placeholder: string | undefined;
  onSubmit: (text: string) => void;
};

/** Collects a free-form answer for a clarification request. */
export function FreeTextBody({
  placeholder,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const [value, setValue] = useState("");
  const reference = useRef<HTMLTextAreaElement>(null);
  const { t } = useLingui();

  useEffect(function focusAnswerInput() {
    reference.current?.focus();
  }, []);

  const onSubmitAnswer = () => {
    const trimmedAnswer = value.trim();
    if (trimmedAnswer) {
      onSubmit(trimmedAnswer);
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
        aria-label={t`Clarification answer`}
        value={value}
        onChange={(event) => {
          setValue(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) {
            return;
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmitAnswer();
          }
        }}
      />
      <Group justify="flex-end" gap="xs">
        <Button
          size="xs"
          onClick={onSubmitAnswer}
          disabled={value.trim().length === 0}
        >
          <Trans>Send answer</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
