import type { FormErrorSummaryItem } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
import type { ReactNode } from "react";

import { Callout } from "@avandar/ui";
import { Stack, Text } from "@mantine/core";

import classes from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.module.css";

type Props = {
  isVisible: boolean;
  items: readonly FormErrorSummaryItem[];
  title: string;
  message: string;
};

/** Every outstanding validation error, under the field that holds it. */
export function ErrorSummary({
  isVisible,
  items,
  title,
  message,
}: Readonly<Props>): ReactNode {
  if (!isVisible || items.length === 0) {
    return undefined;
  }
  return (
    <Callout color="error" title={title} message={message}>
      <Stack
        component="ul"
        className={classes.datasetImportFormErrorList}
        gap="xs"
        mt="xs"
      >
        {items.map((item) => {
          return (
            <Text component="li" key={item.field} size="sm" c="red.8">
              {item.line}
            </Text>
          );
        })}
      </Stack>
    </Callout>
  );
}
