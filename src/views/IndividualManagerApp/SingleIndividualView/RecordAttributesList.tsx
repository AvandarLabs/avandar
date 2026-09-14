import { unknownToString } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.module.css";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ReactNode } from "react";

export type RecordAttributeRow = {
  name: string;
  value: unknown;
  sourceType?: DatasetSource.SourceType;
  sourceName?: string;
};

type Props = {
  attributes: readonly RecordAttributeRow[];
};

/**
 * Field grid for a case record: label, optional source, then value.
 */
export function RecordAttributesList({ attributes }: Props): ReactNode {
  if (attributes.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        <Trans>No fields yet</Trans>
      </Text>
    );
  }

  return (
    <div className={css.grid} role="list">
      {attributes.map((attribute) => {
        return (
          <div key={attribute.name} role="listitem" className={css.field}>
            <Text size="xs" c="dimmed">
              {attribute.name}
              {attribute.sourceName ? (
                <span className={css.source}> · {attribute.sourceName}</span>
              ) : null}
            </Text>
            <Text className={css.value}>
              {unknownToString(attribute.value)}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
