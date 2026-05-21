import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Button,
  Checkbox,
  Code,
  Group,
  Loader,
  Paper,
  Radio,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconAlertCircle, IconHelp } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  _useClarificationNoneOfAboveLabel,
  _useClarificationSomethingElseLabel,
  CLARIFICATION_NONE_OF_ABOVE,
  CLARIFICATION_SOMETHING_ELSE,
} from "./clarificationAnswer";
import type { ClarificationSubmitAnswer } from "./clarificationAnswer";
import type { ChatClarifyRequest } from "$/types/chat.types";

export type { ClarificationSubmitAnswer } from "./clarificationAnswer";

/**
 * Inline clarification UI rendered in the chat thread (not modal).
 *
 *   - free_text:           Textarea + "Send answer"
 *   - fixed_options multi: checkbox group + "Something else" /
 *     "None of the above"
 *   - fixed_options single: radio group + custom text + "None of the above"
 */
export type DiscoveryResolver = (args: {
  query: string;
  column: string;
}) => Promise<{ values: string[] } | { error: string }>;

export type ClarificationCardProps = {
  request: ChatClarifyRequest;
  onAnswer: (answer: ClarificationSubmitAnswer) => void;
  resolveDiscovery?: DiscoveryResolver;
};

export function ClarificationCard({
  request,
  onAnswer,
  resolveDiscovery,
}: ClarificationCardProps): JSX.Element {
  const { question, rationale, responseShape, turnNumber } = request;

  return (
    <Paper
      withBorder
      shadow="xs"
      radius="md"
      p="md"
      style={{ backgroundColor: "var(--mantine-color-blue-0)" }}
    >
      <Stack gap="sm">
        <Group gap="xs" align="flex-start">
          <IconHelp
            size={16}
            color="var(--mantine-color-blue-6)"
            style={{ marginTop: 2 }}
          />
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="sm" fw={600}>
              {question}
            </Text>
            {rationale ?
              <Text size="xs" c="dimmed">
                {rationale}
              </Text>
            : null}
            <Text size="xs" c="dimmed">
              <Trans>Clarification {turnNumber} of 3</Trans>
            </Text>
          </Stack>
        </Group>

        {(() => {
          if (responseShape.kind === "free_text") {
            return (
              <FreeTextBody
                placeholder={responseShape.placeholder}
                onSubmit={(text) => {
                  return onAnswer({ kind: "custom", text });
                }}
              />
            );
          }
          if (responseShape.kind === "fixed_options") {
            return (
              <FixedOptionsBody
                options={responseShape.options}
                multi={responseShape.multi}
                onSubmit={onAnswer}
              />
            );
          }
          return (
            <DiscoveryBody
              query={responseShape.query}
              column={responseShape.column}
              multi={responseShape.multi}
              resolveDiscovery={resolveDiscovery}
              onSubmit={onAnswer}
            />
          );
        })()}
      </Stack>
    </Paper>
  );
}

function FreeTextBody({
  placeholder,
  onSubmit,
}: {
  placeholder: string | undefined;
  onSubmit: (text: string) => void;
}): JSX.Element {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const { t } = useLingui();

  useEffect(() => {
    ref.current?.focus();
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
        ref={ref}
        placeholder={placeholder ?? t`Type your answer...`}
        autosize
        minRows={1}
        maxRows={4}
        value={value}
        onChange={(e) => {
          return setValue(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
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

function FixedOptionsBody({
  options,
  multi,
  onSubmit,
}: {
  options: readonly string[];
  multi: boolean;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
}): JSX.Element {
  const [single, setSingle] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const { t } = useLingui();
  const noneOfAboveLabel = _useClarificationNoneOfAboveLabel();
  const somethingElseLabel = _useClarificationSomethingElseLabel();

  const isSomethingElseSelected =
    multi ?
      multiSelected.includes(CLARIFICATION_SOMETHING_ELSE)
    : single === CLARIFICATION_SOMETHING_ELSE;
  const isNoneOfAboveSelected = single === CLARIFICATION_NONE_OF_ABOVE;

  const trimmedCustom = customText.trim();
  const canSubmitCustom = isSomethingElseSelected && trimmedCustom.length > 0;

  const submit = () => {
    if (isNoneOfAboveSelected) {
      onSubmit({ kind: "none_of_above" });
      return;
    }
    if (canSubmitCustom) {
      onSubmit({ kind: "custom", text: trimmedCustom });
      return;
    }
    if (multi) {
      const preset = multiSelected.filter((v) => {
        return v !== CLARIFICATION_SOMETHING_ELSE;
      });
      if (preset.length > 0) {
        onSubmit({ kind: "preset", value: preset });
      }
    } else if (single && single !== CLARIFICATION_SOMETHING_ELSE) {
      onSubmit({ kind: "preset", value: single });
    }
  };

  const canSubmit =
    isNoneOfAboveSelected ||
    canSubmitCustom ||
    (multi ?
      multiSelected.some((v) => {
        return v !== CLARIFICATION_SOMETHING_ELSE;
      })
    : Boolean(single) && single !== CLARIFICATION_SOMETHING_ELSE);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        submit();
      }
    }
  };

  const handleSingleChange = (value: string) => {
    setSingle(value);
    if (value !== CLARIFICATION_SOMETHING_ELSE) {
      setCustomText("");
    }
  };

  const handleMultiChange = (values: string[]) => {
    setMultiSelected(values);
    if (!values.includes(CLARIFICATION_SOMETHING_ELSE)) {
      setCustomText("");
    }
  };

  return (
    <Stack gap="xs" onKeyDown={handleKey}>
      {multi ?
        <>
          <Checkbox.Group
            value={multiSelected}
            onChange={handleMultiChange}
            aria-label={t`Pick one or more`}
          >
            <Stack gap={4}>
              {options.map((opt) => {
                return <Checkbox key={opt} value={opt} label={opt} />;
              })}
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
              onClick={() => {
                setMultiSelected([...options]);
              }}
            >
              <Trans>Select all</Trans>
            </Button>
          : null}
        </>
      : <Radio.Group
          value={single}
          onChange={handleSingleChange}
          aria-label={t`Pick one`}
        >
          <Stack gap={4}>
            {options.map((opt) => {
              return <Radio key={opt} value={opt} label={opt} />;
            })}
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
          onChange={(e) => {
            return setCustomText(e.currentTarget.value);
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
            onClick={() => {
              onSubmit({ kind: "none_of_above" });
            }}
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

type DiscoveryState =
  | { kind: "loading" }
  | { kind: "ready"; values: string[] }
  | { kind: "error"; error: string }
  | { kind: "empty" };

function DiscoveryBody({
  query,
  column,
  multi,
  resolveDiscovery,
  onSubmit,
}: {
  query: string;
  column: string;
  multi: boolean;
  resolveDiscovery: DiscoveryResolver | undefined;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
}): JSX.Element {
  const [state, setState] = useState<DiscoveryState>({ kind: "loading" });
  const { t } = useLingui();

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      if (!resolveDiscovery) {
        setState({
          kind: "error",
          error: t`Discovery is not available in this context.`,
        });
        return;
      }
      try {
        const result = await resolveDiscovery({ query, column });
        if (cancelled) {
          return;
        }
        if ("error" in result) {
          setState({ kind: "error", error: result.error });
        } else if (result.values.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "ready", values: result.values });
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setState({
          kind: "error",
          error: e instanceof Error ? e.message : t`Query failed.`,
        });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [query, column, resolveDiscovery, t]);

  const queryPreview = useMemo(() => {
    return query.length > 200 ? `${query.slice(0, 200)}…` : query;
  }, [query]);

  if (state.kind === "loading") {
    return (
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">
          <Trans>Looking up values in {column}…</Trans>
        </Text>
      </Group>
    );
  }
  if (state.kind === "error") {
    return (
      <Stack gap="xs">
        <Alert
          icon={<IconAlertCircle size={14} />}
          color="red"
          variant="light"
          radius="sm"
          p="xs"
        >
          <Text size="xs">{state.error}</Text>
          <Code block fz="xs" mt={4}>
            {queryPreview}
          </Code>
        </Alert>
        <DiscoveryCustomFallback onSubmit={onSubmit} />
      </Stack>
    );
  }
  if (state.kind === "empty") {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          <Trans>
            No values were returned from {column}. Describe what you need
            instead.
          </Trans>
        </Text>
        <DiscoveryCustomFallback onSubmit={onSubmit} />
      </Stack>
    );
  }

  return (
    <FixedOptionsBody
      options={state.values}
      multi={multi}
      onSubmit={onSubmit}
    />
  );
}

function DiscoveryCustomFallback({
  onSubmit,
}: {
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
}): JSX.Element {
  const { t } = useLingui();
  return (
    <FreeTextBody
      placeholder={t`Type your answer…`}
      onSubmit={(text) => {
        onSubmit({ kind: "custom", text });
      }}
    />
  );
}
