import { Paper, Text, Transition } from "@mantine/core";
import css from "./ManualQueryLargeDatasetLimitHint.module.css";

/** How long the large-dataset limit hint stays visible before fading out. */
export const LARGE_DATASET_LIMIT_HINT_VISIBLE_MS = 4_000;

type Props = {
  visible: boolean;
};

/**
 * Short-lived callout shown beside the Limit field after we auto-apply a
 * default row cap on a large dataset.
 */
export function ManualQueryLargeDatasetLimitHint({
  visible,
}: Props): JSX.Element {
  return (
    <Transition mounted={visible} transition="fade-up" duration={220}>
      {(transitionStyle) => {
        return (
          <Paper
            className={css.hint}
            p="xs"
            radius="sm"
            shadow="sm"
            style={transitionStyle}
            role="status"
            aria-live="polite"
          >
            <Text size="xs" c="blue.9">
              This dataset is large, so we applied a 100-row limit. You can
              change it anytime.
            </Text>
          </Paper>
        );
      }}
    </Transition>
  );
}
