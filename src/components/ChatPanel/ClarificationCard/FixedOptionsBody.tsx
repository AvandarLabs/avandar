import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Checkbox, Group, Radio, Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import {
  CLARIFICATION_NONE_OF_ABOVE,
  CLARIFICATION_SOMETHING_ELSE,
  useClarificationNoneOfAboveLabel,
  useClarificationSomethingElseLabel,
} from "./clarificationAnswer/clarificationAnswer";
import type { ClarificationSubmitAnswer } from "./clarificationAnswer/clarificationAnswer";

export type FixedOptionsBodyProps = {
  options: readonly string[];
  multi: boolean;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Collects a single- or multi-select answer with optional custom text. */
export function FixedOptionsBody({
  options,
  multi,
  onSubmit,
}: FixedOptionsBodyProps): React.ReactNode {
  const [single, setSingle] = useState<string>();
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const { t } = useLingui();
  const noneOfAboveLabel = useClarificationNoneOfAboveLabel();
  const somethingElseLabel = useClarificationSomethingElseLabel();
  const isSomethingElseSelected =
    multi ?
      multiSelected.includes(CLARIFICATION_SOMETHING_ELSE)
    : single === CLARIFICATION_SOMETHING_ELSE;
  const isNoneOfAboveSelected = single === CLARIFICATION_NONE_OF_ABOVE;
  const trimmedCustom = customText.trim();
  const canSubmitCustom = isSomethingElseSelected && trimmedCustom.length > 0;

  const submit = () => {
    if (isNoneOfAboveSelected) return onSubmit({ kind: "none_of_above" });
    if (canSubmitCustom)
      return onSubmit({ kind: "custom", text: trimmedCustom });
    if (multi) {
      const preset = multiSelected.filter(
        (value) => {return value !== CLARIFICATION_SOMETHING_ELSE},
      );
      if (preset.length > 0) onSubmit({ kind: "preset", value: preset });
    } else if (single && single !== CLARIFICATION_SOMETHING_ELSE) {
      onSubmit({ kind: "preset", value: single });
    }
  };

  const canSubmit =
    isNoneOfAboveSelected ||
    canSubmitCustom ||
    (multi ?
      multiSelected.some((value) => {
        return value !== CLARIFICATION_SOMETHING_ELSE;
      })
    : Boolean(single) && single !== CLARIFICATION_SOMETHING_ELSE);

  return (
    <Stack
      gap="xs"
      onKeyDown={(event) => {
        if (
          !event.nativeEvent.isComposing &&
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          if (canSubmit) submit();
        }
      }}
    >
      {multi ?
        <>
          <Checkbox.Group
            value={multiSelected}
            onChange={(values) => {
              setMultiSelected(values);
              if (!values.includes(CLARIFICATION_SOMETHING_ELSE))
                setCustomText("");
            }}
            aria-label={t`Pick one or more`}
          >
            <Stack gap={4}>
              {options.map((option) => {return (
                <Checkbox key={option} value={option} label={option} />
              )})}
              <Checkbox
                value={CLARIFICATION_SOMETHING_ELSE}
                label={somethingElseLabel}
              />
            </Stack>
          </Checkbox.Group>
          {options.length > 2 ?
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {return setMultiSelected([...options])}}
            >
              <Trans>Select all</Trans>
            </Button>
          : null}
        </>
      : <Radio.Group
          value={single ?? null}
          onChange={(value) => {
            setSingle(value);
            if (value !== CLARIFICATION_SOMETHING_ELSE) setCustomText("");
          }}
          aria-label={t`Pick one`}
        >
          <Stack gap={4}>
            {options.map((option) => {return (
              <Radio key={option} value={option} label={option} />
            )})}
            <Radio
              value={CLARIFICATION_SOMETHING_ELSE}
              label={somethingElseLabel}
            />
            <Radio
              value={CLARIFICATION_NONE_OF_ABOVE}
              label={noneOfAboveLabel}
            />
          </Stack>
        </Radio.Group>
      }
      {isSomethingElseSelected ?
        <Textarea
          placeholder={t`Describe your answer…`}
          autosize
          minRows={1}
          maxRows={4}
          value={customText}
          onChange={(event) => {
            return setCustomText(event.currentTarget.value);
          }}
          aria-label={t`Custom clarification answer`}
        />
      : null}
      <Group justify="flex-end" gap="xs">
        {multi ?
          <Button
            variant="subtle"
            color="neutral"
            size="xs"
            onClick={() => {return onSubmit({ kind: "none_of_above" })}}
            disabled={isSomethingElseSelected}
          >
            {noneOfAboveLabel}
          </Button>
        : null}
        <Button size="xs" onClick={submit} disabled={!canSubmit}>
          <Trans>Confirm</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
