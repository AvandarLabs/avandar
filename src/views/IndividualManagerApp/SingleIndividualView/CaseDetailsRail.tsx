import { unknownToString } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { ReactNode } from "react";

/** One field of a case as the rail shows it. */
export type CaseDetailsRow = {
  name: string;
  value: unknown;
  sourceName?: string;
};

type Props = {
  /** The case's fields, or `undefined` while they load. */
  attributes: readonly CaseDetailsRow[] | undefined;
};

/** The case's fields as reference material in the properties rail. */
export function CaseDetailsRail({ attributes }: Props): ReactNode {
  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Details</Trans>}>
        {attributes === undefined ? (
          <Loader size="xs" />
        ) : attributes.length === 0 ? (
          <Text size="sm" c="dimmed">
            <Trans>No fields yet</Trans>
          </Text>
        ) : (
          attributes.map((attribute) => {
            return (
              <AppViewRail.Fact key={attribute.name} label={attribute.name}>
                {unknownToString(attribute.value)}
                {attribute.sourceName ? (
                  <Text size="xs" c="dimmed">
                    {attribute.sourceName}
                  </Text>
                ) : null}
              </AppViewRail.Fact>
            );
          })
        )}
      </AppViewRail.Group>
    </AppViewRail>
  );
}
