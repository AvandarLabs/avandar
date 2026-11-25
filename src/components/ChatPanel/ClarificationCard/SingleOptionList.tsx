import { useLingui } from "@lingui/react/macro";
import { Radio, Stack } from "@mantine/core";
import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  options: readonly string[];
  optionLabels?: readonly string[];
  selectedOption: string | undefined;
  noneOfAboveLabel: string;
  somethingElseLabel: string;
  onChange: (value: string) => void;
};

/** Renders the available single-select clarification options. */
export function SingleOptionList({
  options,
  optionLabels,
  selectedOption,
  noneOfAboveLabel,
  somethingElseLabel,
  onChange,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <Radio.Group
      value={selectedOption ?? null}
      onChange={onChange}
      aria-label={t`Pick one`}
    >
      <Stack gap={4}>
        {options.map((option, index) => {
          return (
            <Radio
              key={option}
              value={option}
              label={optionLabels?.[index] ?? option}
            />
          );
        })}
        <Radio
          value={ClarificationAnswer.somethingElse}
          label={somethingElseLabel}
        />
        <Radio
          value={ClarificationAnswer.noneOfAbove}
          label={noneOfAboveLabel}
        />
      </Stack>
    </Radio.Group>
  );
}
