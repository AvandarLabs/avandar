import { Group, Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/layouts/AppView/AppViewSection.module.css";
import type { ReactNode } from "react";

type Props = {
  /** What this part of the view is. Two or three words. */
  title: ReactNode;

  /**
   * A count or qualifier shown next to the title, dimmed. Use it for the
   * facts a user would otherwise have to count for themselves ("6",
   * "first 200 rows").
   */
  meta?: ReactNode;

  /** Controls scoped to this section, aligned to the trailing edge. */
  actions?: ReactNode;

  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * A titled block inside an app view: a hairline-ruled label row, then the
 * content.
 *
 * This is the replacement for the informational `Callout` that used to head
 * each block. A rule and a label cost one line; the callout cost a bordered,
 * tinted panel and three sentences of prose to say the same thing.
 */
export function AppViewSection({
  title,
  meta,
  actions,
  children,
  className,
  id,
}: Readonly<Props>): ReactNode {
  return (
    <section className={clsx(css.section, className)} id={id}>
      <Group
        gap="xs"
        align="baseline"
        wrap="nowrap"
        className={css.headingRow}
      >
        <Text component="h4" className={css.title}>
          {title}
        </Text>
        {meta ? (
          <Text size="sm" c="dimmed" className={css.meta}>
            {meta}
          </Text>
        ) : null}
        {actions ? (
          <Group gap="xs" align="center" wrap="nowrap" className={css.actions}>
            {actions}
          </Group>
        ) : null}
      </Group>
      <div className={css.body}>{children}</div>
    </section>
  );
}
