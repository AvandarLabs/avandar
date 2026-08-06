import { Stack } from "@mantine/core";
import { ClarificationAnswerActions } from "./ClarificationAnswerActions";
import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import { ClarificationCustomTextInput } from "./ClarificationCustomTextInput";
import { SingleOptionList } from "./SingleOptionList";
import { useSingleOptionAnswer } from "./useSingleOptionAnswer";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  options: readonly string[];
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Collects one preset clarification answer or custom text. */
export function SingleOptionBody({
  options,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const answer = useSingleOptionAnswer(onSubmit);
  const noneOfAboveLabel = ClarificationAnswer.useNoneOfAboveLabel();
  const somethingElseLabel = ClarificationAnswer.useSomethingElseLabel();
  return (
    <Stack gap="xs" onKeyDown={answer.onKeyDown}>
      <SingleOptionList
        options={options}
        selectedOption={answer.selectedOption}
        noneOfAboveLabel={noneOfAboveLabel}
        somethingElseLabel={somethingElseLabel}
        onChange={answer.onOptionChange}
      />
      {answer.isCustomSelected ?
        <ClarificationCustomTextInput
          value={answer.customText}
          onChange={answer.onCustomTextChange}
        />
      : null}
      <ClarificationAnswerActions
        canSubmit={answer.canSubmit}
        onConfirm={answer.onSubmitAnswer}
      />
    </Stack>
  );
}
