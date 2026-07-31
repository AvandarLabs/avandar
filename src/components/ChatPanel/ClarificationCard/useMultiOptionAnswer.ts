import { valNotEq } from "@utils";
import { useState } from "react";
import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { Dispatch, KeyboardEventHandler, SetStateAction } from "react";

function _createSubmitAnswer(
  parameters: Readonly<{
    isCustomSelected: boolean;
    onSubmit: (answer: ClarificationSubmitAnswer) => void;
    selectedPresetValues: string[];
    trimmedCustomText: string;
  }>,
): () => void {
  const {
    isCustomSelected,
    onSubmit,
    selectedPresetValues,
    trimmedCustomText,
  } = parameters;
  return () => {
    if (isCustomSelected && trimmedCustomText) {
      onSubmit({ kind: "custom", text: trimmedCustomText });
    } else if (selectedPresetValues.length > 0) {
      onSubmit({ kind: "preset", value: selectedPresetValues });
    }
  };
}

function _createOptionsChangeHandler(
  parameters: Readonly<{
    setSelectedOptions: Dispatch<SetStateAction<string[]>>;
    setCustomText: Dispatch<SetStateAction<string>>;
  }>,
): (values: string[]) => void {
  const { setSelectedOptions, setCustomText } = parameters;
  return (values) => {
    setSelectedOptions(values);
    if (!values.includes(ClarificationAnswer.somethingElse)) {
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

/** Manages state and submission for a multi-option clarification. */
export function useMultiOptionAnswer(
  parameters: Readonly<{
    options: readonly string[];
    onSubmit: (answer: ClarificationSubmitAnswer) => void;
  }>,
): {
  canSubmit: boolean;
  customText: string;
  isCustomSelected: boolean;
  selectedOptions: string[];
  onCustomTextChange: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onNoneOfAbove: () => void;
  onOptionsChange: (values: string[]) => void;
  onSelectAll: () => void;
  onSubmitAnswer: () => void;
} {
  const { options, onSubmit } = parameters;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const isCustomSelected = selectedOptions.includes(
    ClarificationAnswer.somethingElse,
  );
  const selectedPresetValues = selectedOptions.filter(
    valNotEq(ClarificationAnswer.somethingElse),
  );
  const trimmedCustomText = customText.trim();
  const canSubmit =
    (isCustomSelected && trimmedCustomText.length > 0) ||
    selectedPresetValues.length > 0;
  const onSubmitAnswer = _createSubmitAnswer({
    isCustomSelected,
    onSubmit,
    selectedPresetValues,
    trimmedCustomText,
  });
  return {
    canSubmit,
    customText,
    isCustomSelected,
    selectedOptions,
    onCustomTextChange: setCustomText,
    onKeyDown: _createSubmitOnEnterHandler({ canSubmit, onSubmitAnswer }),
    onNoneOfAbove: () => {
      onSubmit({ kind: "none_of_above" });
    },
    onOptionsChange: _createOptionsChangeHandler({
      setSelectedOptions,
      setCustomText,
    }),
    onSelectAll: () => {
      setSelectedOptions([...options]);
    },
    onSubmitAnswer,
  };
}
