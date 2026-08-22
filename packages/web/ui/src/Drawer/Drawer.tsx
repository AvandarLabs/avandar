import type { DrawerProps as MantineDrawerProps } from "@mantine/core";

import { Drawer as MantineDrawer } from "@mantine/core";
import clsx from "clsx";

import classes from "./Drawer.module.css";

type Props = MantineDrawerProps & {
  /**
   * Scope the drawer to render inside a specific element instead of the
   * document body. Accepts a CSS selector string or HTMLElement. When set,
   * the drawer's overlay and inner positioning switch from `fixed` to
   * `absolute` so the drawer is constrained to the boundary element's box.
   *
   * Useful for constraining the drawer to the app's main layout area so it
   * does not cover the side navbar or the chat panel (Aside).
   */
  boundary?: string | HTMLElement;
};

/**
 * Avandar Drawer wrapper around Mantine's Drawer. Applies our theme tokens
 * (surfaces, borders, shadows) and supports scoping the drawer to a parent
 * element via the `boundary` prop.
 */
export function Drawer({
  boundary,
  classNames,
  portalProps,
  ...rest
}: Props): JSX.Element {
  const isScoped = boundary !== undefined;

  const resolvedClassNames = {
    root: clsx(isScoped && classes.scopedRoot, classNames?.root),
    inner: clsx(isScoped && classes.scopedInner, classNames?.inner),
    overlay: clsx(isScoped && classes.scopedOverlay, classNames?.overlay),
    content: clsx(classes.content, classNames?.content),
    header: clsx(classes.header, classNames?.header),
    body: clsx(classes.body, classNames?.body),
  };

  return (
    <MantineDrawer
      classNames={resolvedClassNames}
      portalProps={
        isScoped ? { ...portalProps, target: boundary } : portalProps
      }
      {...rest}
    />
  );
}
