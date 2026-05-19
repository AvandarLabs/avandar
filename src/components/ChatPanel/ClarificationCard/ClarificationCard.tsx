import {
  Button,
  Checkbox,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { ChatClarifyRequest } from "$/types/chat.types";

/**
 * Inline clarification UI rendered in the chat thread (not modal).
 *
 *   - free_text:           single Textarea + "Let AI decide" / "Send answer"
 *   - fixed_options multi: checkbox group + "Let AI decide" / "Confirm"
 *   - fixed_options single: radio group + "Let AI decide" / "Confirm"
 *
 * Keyboard behaviour per the spec:
 *   - Auto-focus on mount
 *   - Enter submits
 *   - Escape triggers "Let AI decide"
 */
export type ClarificationCardProps = {
  request: ChatClarifyRequest;
  onAnswer: (answer: string | string[] | null) => void;
};

export function ClarificationCard({
  request,
  onAnswer,
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
              Clarification {turnNumber} of 3
            </Text>
          </Stack>
        </Group>

        {responseShape.kind === "free_text" ?
          <FreeTextBody
            placeholder={responseShape.placeholder}
            onSubmit={(answer) => {
              return onAnswer(answer);
            }}
            onSkip={() => {
              return onAnswer(null);
            }}
          />
        : <FixedOptionsBody
            options={responseShape.options}
            multi={responseShape.multi}
            onSubmit={(answer) => {
              return onAnswer(answer);
            }}
            onSkip={() => {
              return onAnswer(null);
            }}
          />
        }
      </Stack>
    </Paper>
  );
}

function FreeTextBody({
  placeholder,
  onSubmit,
  onSkip,
}: {
  placeholder: string | undefined;
  onSubmit: (text: string) => void;
  onSkip: () => void;
}): JSX.Element {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Stack gap="xs">
      <Textarea
        ref={ref}
        placeholder={placeholder ?? "Type your answer..."}
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
            const trimmed = value.trim();
            if (trimmed) {
              onSubmit(trimmed);
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onSkip();
          }
        }}
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" color="neutral" size="xs" onClick={onSkip}>
          Let AI decide
        </Button>
        <Button
          size="xs"
          onClick={() => {
            const trimmed = value.trim();
            if (trimmed) {
              onSubmit(trimmed);
            }
          }}
          disabled={value.trim().length === 0}
        >
          Send answer
        </Button>
      </Group>
    </Stack>
  );
}

function FixedOptionsBody({
  options,
  multi,
  onSubmit,
  onSkip,
}: {
  options: readonly string[];
  multi: boolean;
  onSubmit: (answer: string | string[]) => void;
  onSkip: () => void;
}): JSX.Element {
  const [single, setSingle] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);

  const submit = () => {
    if (multi) {
      if (multiSelected.length > 0) {
        onSubmit(multiSelected);
      }
    } else if (single) {
      onSubmit(single);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onSkip();
    }
  };

  return (
    <Stack gap="xs" onKeyDown={handleKey}>
      {multi ?
        <>
          <Checkbox.Group
            value={multiSelected}
            onChange={setMultiSelected}
            aria-label="Pick one or more"
          >
            <Stack gap={4}>
              {options.map((opt) => {
                return <Checkbox key={opt} value={opt} label={opt} />;
              })}
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
              Select all
            </Button>
          : null}
        </>
      : <Radio.Group
          value={single}
          onChange={setSingle}
          aria-label="Pick one"
        >
          <Stack gap={4}>
            {options.map((opt) => {
              return <Radio key={opt} value={opt} label={opt} />;
            })}
          </Stack>
        </Radio.Group>
      }

      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" color="neutral" size="xs" onClick={onSkip}>
          Let AI decide
        </Button>
        <Button
          size="xs"
          onClick={submit}
          disabled={multi ? multiSelected.length === 0 : !single}
        >
          Confirm
        </Button>
      </Group>
    </Stack>
  );
}
