import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { Dispatch, KeyboardEventHandler, SetStateAction } from "react";

import { useState } from "react";

import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

function _createSubmitAnswer(
  parameters: Readonly<{
    isCustomSelected: boolean;
    onSubmit: (answer: ClarificationSubmitAnswer) => void;
    selectedOption: string | undefined;
    trimmedCustomText: string;
  }>,
): () => void {
  const { isCustomSelected, onSubmit, selectedOption, trimmedCustomText } =
    parameters;
  return () => {
    if (selectedOption === ClarificationAnswer.noneOfAbove) {
      onSubmit({ kind: "none_of_above" });
    } else if (isCustomSelected && trimmedCustomText) {
      onSubmit({ kind: "custom", text: trimmedCustomText });
    } else if (selectedOption) {
      onSubmit({ kind: "preset", value: selectedOption });
    }
  };
}

function _createOptionChangeHandler(
  parameters: Readonly<{
    setSelectedOption: Dispatch<SetStateAction<string | undefined>>;
    setCustomText: Dispatch<SetStateAction<string>>;
  }>,
): (value: string) => void {
  const { setSelectedOption, setCustomText } = parameters;
  return (value) => {
    setSelectedOption(value);
    if (value !== ClarificationAnswer.somethingElse) {
      setCustomText("");
    }
  };
}

function _createSubmitOnEnterHandler(
  parameters: Readonly<{
    canSubmit: boolean;
    onSubmitAnswer: () => void;
  }>,
): KeyboardEventHandler<HTMLDivElement> {
  const { canSubmit, onSubmitAnswer } = parameters;
  return (event) => {
    if (
      !event.nativeEvent.isComposing &&
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      if (canSubmit) {
        onSubmitAnswer();
      }
    }
  };
}

/** Manages state and submission for a single-option clarification. */
export function useSingleOptionAnswer(
  onSubmit: (answer: ClarificationSubmitAnswer) => void,
): {
  canSubmit: boolean;
  customText: string;
  isCustomSelected: boolean;
  selectedOption: string | undefined;
  onCustomTextChange: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onOptionChange: (value: string) => void;
  onSubmitAnswer: () => void;
} {
  const [selectedOption, setSelectedOption] = useState<string>();
  const [customText, setCustomText] = useState("");
  const isCustomSelected = selectedOption === ClarificationAnswer.somethingElse;
  const trimmedCustomText = customText.trim();
  const canSubmit =
    Boolean(selectedOption) &&
    (!isCustomSelected || trimmedCustomText.length > 0);
  const onSubmitAnswer = _createSubmitAnswer({
    isCustomSelected,
    onSubmit,
    selectedOption,
    trimmedCustomText,
  });
  return {
    canSubmit,
    customText,
    isCustomSelected,
    selectedOption,
    onCustomTextChange: setCustomText,
    onKeyDown: _createSubmitOnEnterHandler({ canSubmit, onSubmitAnswer }),
    onOptionChange: _createOptionChangeHandler({
      setSelectedOption,
      setCustomText,
    }),
    onSubmitAnswer,
  };
}
