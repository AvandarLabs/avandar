import { Stack } from "@mantine/core";
import { ClarificationAnswerActions } from "./ClarificationAnswerActions";
import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import { ClarificationCustomTextInput } from "./ClarificationCustomTextInput";
import { MultiOptionList } from "./MultiOptionList";
import { useMultiOptionAnswer } from "./useMultiOptionAnswer";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  options: readonly string[];
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Collects multiple preset clarification answers or custom text. */
export function MultiOptionBody({
  options,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const answer = useMultiOptionAnswer({ options, onSubmit });
  const noneOfAboveLabel = ClarificationAnswer.useNoneOfAboveLabel();
  const somethingElseLabel = ClarificationAnswer.useSomethingElseLabel();
  return (
    <Stack gap="xs" onKeyDown={answer.onKeyDown}>
      <MultiOptionList
        options={options}
        selectedOptions={answer.selectedOptions}
        somethingElseLabel={somethingElseLabel}
        onChange={answer.onOptionsChange}
        onSelectAll={answer.onSelectAll}
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
        noneOfAboveLabel={noneOfAboveLabel}
        onNoneOfAbove={answer.onNoneOfAbove}
        isNoneOfAboveDisabled={answer.isCustomSelected}
      />
    </Stack>
  );
}
