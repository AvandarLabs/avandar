import { Box } from "@mantine/core";
import css from "./TimelineEndpoint.module.css";
import type { ReactElement } from "react";

/** Marks an endpoint on a date-column timeline. */
export function TimelineEndpoint(): ReactElement {
  return <Box h={10} w={10} bg="primary.6" className={css.endpoint} />;
}
