import { Badge, Text } from "@mantine/core";
import type { SummarySpan } from "./shareSummary";

const VARIANT_COLOR: Record<
  Extract<SummarySpan, { kind: "pill" }>["variant"],
  string
> = {
  user: "blue",
  group: "violet",
  workspace: "gray",
  app: "teal",
  role: "orange",
};

type Props = {
  spans: readonly SummarySpan[];
};

/**
 * Renders the precomputed summary spans inline as text + Mantine badges.
 * Pure presentation — all formatting decisions live upstream in
 * `buildShareSummary` so this component is trivial to test.
 *
 * The pills are decorative: each pill's `label` is part of the surrounding
 * sentence text so screen readers read one continuous sentence.
 */
export function ShareSummaryLine({ spans }: Props): JSX.Element {
  return (
    <Text
      component="div"
      size="sm"
      c="dimmed"
      style={{ lineHeight: 1.8 }}
    >
      {spans.map((span, i) => {
        if (span.kind === "text") {
          return <span key={i}>{span.text}</span>;
        }
        return (
          <Badge
            key={i}
            component="span"
            variant="light"
            color={VARIANT_COLOR[span.variant]}
            radius="sm"
            mx={2}
            style={{ verticalAlign: "baseline" }}
          >
            {span.label}
          </Badge>
        );
      })}
    </Text>
  );
}
