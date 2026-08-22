import { Box } from "@mantine/core";
import css from "./SummaryTag.module.css";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Highlights a value embedded in a column-summary sentence. */
export function SummaryTag({ children }: Props): ReactNode {
  return (
    <Box component="span" bg="neutral.0" className={css.tag}>
      {children}
    </Box>
  );
}
