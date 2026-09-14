import { Box } from "@mantine/core";
import css from "./SummaryTag.module.css";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Highlights a value embedded in a column-summary sentence.
 *
 * `neutral.1` rather than `neutral.0`: a chip this small has to be a step
 * clear of the ground to read as a chip, and the ground is now `neutral.0`.
 */
export function SummaryTag({ children }: Props): ReactNode {
  return (
    <Box component="span" bg="neutral.1" className={css.tag}>
      {children}
    </Box>
  );
}
