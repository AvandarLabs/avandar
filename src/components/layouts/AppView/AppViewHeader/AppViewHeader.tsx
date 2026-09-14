import { isNonNullish } from "@avandar/utils";
import { Group, Text } from "@mantine/core";
import { Fragment } from "react";
import css from "@/components/layouts/AppView/AppViewHeader/AppViewHeader.module.css";
import type { ReactNode } from "react";

type Props = {
  /**
   * The name of the thing on screen. Takes a node rather than a string so a
   * record's title can be an inline-editable field.
   */
  title: ReactNode;

  /**
   * Short facts about the thing on screen, rendered on one line separated by
   * middots. Keep them to values a user scans rather than reads: a type, a
   * count, a date. Anything that needs a label belongs in the rail.
   */
  facts?: ReadonlyArray<ReactNode | undefined>;

  /**
   * One sentence of guidance. Used when the view is a task ("Import data")
   * rather than a record, where there are no facts to state yet.
   */
  description?: ReactNode;

  /** Controls that act on the whole view, aligned to the trailing edge. */
  actions?: ReactNode;
};

/**
 * The band at the top of an app view: what you are looking at, the facts
 * that identify it, and the actions that apply to all of it.
 *
 * It is the only chrome between the slate toolbar and the content, and it
 * replaces the page-title-inside-a-card pattern. Facts live here instead of
 * as rows in a table so the identity of a record costs one line rather than
 * a screenful.
 */
export function AppViewHeader({
  title,
  facts,
  description,
  actions,
}: Readonly<Props>): ReactNode {
  const visibleFacts = facts?.filter((fact) => {
    return isNonNullish(fact) && fact !== "";
  });

  return (
    <header className={css.appViewHeader}>
      <Group
        gap="sm"
        wrap="nowrap"
        align="center"
        className={css.appViewHeaderTitleRow}
      >
        {typeof title === "string" ? (
          <h3 className={css.appViewHeaderTitle}>{title}</h3>
        ) : (
          /*
           * An inline-editable title renders a paragraph in display mode and
           * an input in edit mode, neither of which may sit inside a heading
           * element. The ARIA role gives assistive tech the same structure
           * without the invalid nesting.
           */
          <div role="heading" aria-level={3} className={css.appViewHeaderTitle}>
            {title}
          </div>
        )}
        {actions ? (
          <Group gap="xs" wrap="nowrap" className={css.appViewHeaderActions}>
            {actions}
          </Group>
        ) : null}
      </Group>

      {visibleFacts && visibleFacts.length > 0 ? (
        <Text
          component="p"
          size="sm"
          c="dimmed"
          className={css.appViewHeaderFacts}
        >
          {visibleFacts.map((fact, index) => {
            return (
              // The facts are a fixed, ordered list built by the view, so
              // the index is a stable identity for them.
              <Fragment key={index}>
                {index > 0 ? (
                  <span aria-hidden className={css.appViewHeaderFactSeparator}>
                    ·
                  </span>
                ) : null}
                {fact}
              </Fragment>
            );
          })}
        </Text>
      ) : null}

      {description ? (
        <Text
          component="p"
          size="sm"
          c="dimmed"
          className={css.appViewHeaderDescription}
        >
          {description}
        </Text>
      ) : null}
    </header>
  );
}
