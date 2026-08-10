import { Callout } from "@avandar/ui";
import { objectValues } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { flattenError } from "zod";
import type { ReactNode } from "react";

type Props = {
  /** Human-readable chart name, e.g. `bar chart`, shown in the error copy. */
  chartName: string;
  /** The Zod validation error whose field errors are surfaced to the user. */
  error: Parameters<typeof flattenError>[0];
};

/**
 * The error state shown inside a {@link VisualizationContainer} when a chart's
 * config fails schema validation: it turns the flattened Zod field errors into
 * a user-facing callout explaining why that chart cannot be displayed.
 */
export function VisualizationRenderError({
  chartName,
  error,
}: Props): ReactNode {
  // Own `useLingui()` subscription so the summary/title strings below
  // re-render on locale change, matching the hook-bound `t` used by the
  // rest of this reactive component tree.
  const { t } = useLingui();
  const errors = flattenError(error).fieldErrors as Record<
    string,
    readonly string[] | undefined
  >;
  const errorMessages = objectValues(errors).flat();
  const errorBlock = (
    <List size="xl">
      {errorMessages.map((errMsg) => {
        return (
          <List.Item key={errMsg}>
            <Text display="flex" size="xl">
              {errMsg}
            </Text>
          </List.Item>
        );
      })}
    </List>
  );

  const summaryMessage =
    errors.xAxisKey || errors.series ?
      t`The ${chartName} cannot be displayed because there are missing axes or series.`
    : t`The ${chartName} cannot be displayed.`;
  return (
    <Callout.Error
      title={t`Cannot display ${chartName}`}
      message={summaryMessage}
      w="fit-content"
      mt="-20rem"
    >
      {errorBlock}
    </Callout.Error>
  );
}
