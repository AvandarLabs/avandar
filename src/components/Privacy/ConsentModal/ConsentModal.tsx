import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconBulb } from "@tabler/icons-react";
import { useState } from "react";
import type { BiasHit } from "@/lib/privacy/biasDetector";
import type {
  PiiDetectionResult,
  PiiPatternHit,
} from "@/lib/privacy/piiDetector";

/**
 * Modes implemented in v0 of the consent modal:
 *
 *   - `clean` — Mode A in the spec. Simple "Send N values" confirmation.
 *   - `pii_warning` — Mode B. Default-cancel; Send requires a checked ack.
 *   - `bias_nudge` — Mode C. Soft, non-blocking; "continue as-is" always
 *     available alongside "use suggestion".
 *
 * Deferred for a follow-up session, documented in CHECKPOINTS:
 *   - `composite` (Mode D) — bias + PII fired simultaneously
 *   - `medical_strict` (Mode E) — typed-confirmation phrase tier
 */
export type ConsentModalMode = "clean" | "pii_warning" | "bias_nudge";

export type ConsentDecision =
  | { action: "send"; useSuggestion?: boolean }
  | { action: "cancel" };

export type ConsentModalProps = {
  mode: ConsentModalMode;
  /** Short title for the modal header. */
  title: string;
  /** PII findings, populated for `pii_warning` mode. */
  pii?: PiiDetectionResult;
  /** Bias findings, populated for `bias_nudge` mode. */
  bias?: BiasHit[];
  /** What the user wrote. Shown in bias-nudge mode. */
  userText?: string;
  /** Sample of the values that will leave the browser. Capped to ~6. */
  sampleValues?: readonly unknown[];
  /** Total count being sent (sampleValues may be a subset). */
  totalCount?: number;
  /** Source column name, if relevant. */
  columnName?: string;
  onClose: (decision: ConsentDecision) => void;
};

const MAX_PREVIEW_VALUES = 6;

export function ConsentModal({
  mode,
  pii,
  bias,
  userText,
  sampleValues,
  totalCount,
  columnName,
  onClose,
}: ConsentModalProps): JSX.Element {
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);

  const previewValues =
    sampleValues ? sampleValues.slice(0, MAX_PREVIEW_VALUES) : [];

  return (
    <Stack gap="md">
      {mode === "clean" ?
        <>
          <Text size="sm">
            Send <strong>{totalCount ?? sampleValues?.length ?? 0}</strong>{" "}
            value
            {(totalCount ?? sampleValues?.length ?? 0) === 1 ? "" : "s"} to the
            AI?
          </Text>
          {columnName ?
            <Text size="xs" c="dimmed">
              From column: <Code>{columnName}</Code>
            </Text>
          : null}
          <Preview values={previewValues} />
        </>
      : null}

      {mode === "pii_warning" && pii ?
        <>
          <Alert
            color={pii.severity === "critical" ? "red" : "yellow"}
            icon={<IconAlertTriangle size={18} />}
            title="Personal data detected"
          >
            <Text size="sm">
              The values you selected may contain personal information. The AI
              provider will receive them and may log the request.
            </Text>
          </Alert>

          {columnName ?
            <Text size="xs" c="dimmed">
              From column: <Code>{columnName}</Code>
            </Text>
          : null}

          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              Detected:
            </Text>
            {pii.hits.map((h: PiiPatternHit, i) => {
              return (
                <Badge
                  key={`${h.label}-${i}`}
                  size="sm"
                  color={
                    pii.severity === "critical" ? "red"
                    : pii.severity === "warning" ? "yellow"
                    : "gray"
                  }
                  variant="light"
                >
                  {h.label}
                </Badge>
              );
            })}
          </Group>

          <Preview values={previewValues} />

          <Checkbox
            label="I understand this data will be sent to the AI provider"
            checked={piiAcknowledged}
            onChange={(e) => {
              return setPiiAcknowledged(e.currentTarget.checked);
            }}
          />
        </>
      : null}

      {mode === "bias_nudge" && bias && bias.length > 0 ?
        <>
          <Alert
            color="blue"
            icon={<IconBulb size={18} />}
            title="Consider rephrasing"
          >
            <Text size="sm">
              Your question contains language that may bias the AI&apos;s
              answer.
            </Text>
          </Alert>

          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              Detected:
            </Text>
            {bias.map((h, i) => {
              return (
                <Badge
                  key={`${h.label}-${i}`}
                  size="sm"
                  color="blue"
                  variant="light"
                >
                  {h.label}
                </Badge>
              );
            })}
          </Group>

          {userText ?
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                You wrote:
              </Text>
              <Code block>{userText}</Code>
            </Stack>
          : null}

          {bias[0]?.suggestion ?
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                Suggested:
              </Text>
              <Text size="sm">{bias[0].suggestion}</Text>
            </Stack>
          : null}
        </>
      : null}

      <Group justify="flex-end" gap="xs">
        <Button
          variant="subtle"
          color="neutral"
          onClick={() => {
            return onClose({ action: "cancel" });
          }}
        >
          Cancel
        </Button>

        {mode === "bias_nudge" && bias && bias.length > 0 ?
          <Button
            variant="outline"
            color="blue"
            onClick={() => {
              return onClose({ action: "send", useSuggestion: true });
            }}
          >
            Use suggestion
          </Button>
        : null}

        <Button
          color={mode === "pii_warning" ? "red" : "primary"}
          disabled={mode === "pii_warning" && !piiAcknowledged}
          onClick={() => {
            return onClose({ action: "send" });
          }}
          data-autofocus={mode === "clean" || mode === "bias_nudge"}
        >
          {mode === "bias_nudge" ? "Continue as-is" : "Send"}
        </Button>
      </Group>
    </Stack>
  );
}

function Preview({ values }: { values: readonly unknown[] }): JSX.Element | null {
  if (values.length === 0) {
    return null;
  }
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        Preview:
      </Text>
      <Stack gap={2} pl="sm">
        {values.map((value, i) => {
          return (
            <Code key={i} block>
              {String(value)}
            </Code>
          );
        })}
      </Stack>
    </Stack>
  );
}
