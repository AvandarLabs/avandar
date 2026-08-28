import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Checkbox, Stack } from "@mantine/core";
import { ClarificationAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  options: readonly string[];
  selectedOptions: string[];
  somethingElseLabel: string;
  onChange: (values: string[]) => void;
  onSelectAll: () => void;
};

/** Renders the available multi-select clarification options. */
export function MultiOptionList({
  options,
  selectedOptions,
  somethingElseLabel,
  onChange,
  onSelectAll,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Checkbox.Group
        value={selectedOptions}
        onChange={onChange}
        aria-label={t`Pick one or more`}
      >
        <Stack gap={4}>
          {options.map((option) => {
            return <Checkbox key={option} value={option} label={option} />;
          })}
          <Checkbox
            value={ClarificationAnswer.somethingElse}
            label={somethingElseLabel}
          />
        </Stack>
      </Checkbox.Group>
      {options.length > 2 ? (
        <Button variant="subtle" size="xs" onClick={onSelectAll}>
          <Trans>Select all</Trans>
        </Button>
      ) : null}
    </>
  );
}
