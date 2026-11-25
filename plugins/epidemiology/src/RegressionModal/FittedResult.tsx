import { useAvandar, useT } from "@avandar/plugin-sdk";
import { SimpleGrid, Stack, Text } from "@avandar/plugin-ui";
import { makeStatisticTextFromNumber } from "./makeStatisticTextFromNumber/makeStatisticTextFromNumber";
import type { FitState } from "./RegressionModal.types";
import type { ReactNode } from "react";

type Props = {
  fitState: Extract<FitState, { kind: "fitted" }>;
};

/**
 * Shows a fitted regression's slope, intercept, R squared, and rows used, and
 * a note when only the first rows of the result were read. `FitOutcome`
 * renders it once a fit succeeds.
 */
export function FittedResult({ fitState }: Readonly<Props>): ReactNode {
  const { fit, isTruncated, rowCount } = fitState;
  const avandar = useAvandar();
  const t = useT();
  const formatStatistic = (value: number): string => {
    return makeStatisticTextFromNumber({
      value,
      locale: avandar.workspace.locale,
    });
  };
  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {[
          [t("modal.slope"), formatStatistic(fit.slope)],
          [t("modal.intercept"), formatStatistic(fit.intercept)],
          [
            t("modal.rSquared"),
            fit.rSquared === undefined
              ? t("modal.notAvailable")
              : formatStatistic(fit.rSquared),
          ],
          [t("modal.n"), formatStatistic(fit.n)],
        ].map(([label, value]) => {
          return (
            <Stack key={label} gap={0} role="group" aria-label={label}>
              <Text size="xs" c="dimmed">
                {label}
              </Text>
              <Text fw={600}>{value}</Text>
            </Stack>
          );
        })}
      </SimpleGrid>
      {isTruncated ? (
        <Text size="xs" c="dimmed">
          {t("modal.truncated", { count: rowCount })}
        </Text>
      ) : null}
    </Stack>
  );
}
