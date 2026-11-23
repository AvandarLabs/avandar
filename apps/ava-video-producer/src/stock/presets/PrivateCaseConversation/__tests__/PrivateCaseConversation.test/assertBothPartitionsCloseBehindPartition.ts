import { assertBothPartitionsCloseBehindShowWaitingSupporter as _assertBothPartitionsCloseBehindShowWaitingSupporter } from "./assertBothPartitionsCloseBehindShowWaitingSupporter";

/**
 * Asserts both partitions close behind the fully exited supporter with
 * either inset choice.
 */
export function assertBothPartitionsCloseBehindPartition(
  partition: "door" | "screen",
): void {
  return [true, false].forEach((showWaitingSupporter) => {
    return _assertBothPartitionsCloseBehindShowWaitingSupporter({
      showWaitingSupporter,
      partition,
    });
  });
}
