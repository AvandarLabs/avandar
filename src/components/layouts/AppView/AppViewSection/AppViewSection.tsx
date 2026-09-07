import { Group, Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/layouts/AppView/AppViewSection/AppViewSection.module.css";
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
 * A rule and a label cost one line, which is why they head a block here. Do
 * not reach for an informational `Callout` instead: it spends a bordered,
 * tinted panel and three sentences of prose on the same job.
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
    <section className={clsx(css.appViewSection, className)} id={id}>
      <Group
        gap="xs"
        align="baseline"
        wrap="nowrap"
        className={css.appViewSectionHeadingRow}
      >
        <Text component="h4" className={css.appViewSectionTitle}>
          {title}
        </Text>
        {meta ? (
          <Text size="sm" c="dimmed" className={css.appViewSectionMeta}>
            {meta}
          </Text>
        ) : null}
        {actions ? (
          <Group gap="xs" align="center" wrap="nowrap" className={css.appViewSectionActions}>
            {actions}
          </Group>
        ) : null}
      </Group>
      <div className={css.appViewSectionBody}>{children}</div>
    </section>
  );
}
