import {
  DEFAULT_THEME,
  MantineColor,
  NavLink as MantineNavLink,
  NavLinkProps as MantineNavLinkProps,
  useMantineTheme,
} from "@mantine/core";
import { useHover, useMergedRef } from "@mantine/hooks";
import {
  createLink,
  LinkComponent,
  LinkComponentProps,
} from "@tanstack/react-router";
import {
  AnchorHTMLAttributes,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Theme } from "@/config/Theme";
import { noop } from "@/lib/utils/misc";
import { notifyDevAlert } from "../notifications/notifyDevAlert";

const DEFAULT_PRIMARY_SHADE =
  typeof DEFAULT_THEME.primaryShade === "object" ?
    DEFAULT_THEME.primaryShade.light
  : DEFAULT_THEME.primaryShade;

interface NewMantineNavLinkProps
  extends Omit<
    MantineNavLinkProps &
      Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onChange" | "style">,
    "href"
  > {
  /** Color of inactive nav links when hovered */
  inactiveHoverColor?: MantineColor;
}

const MantineNavLinkComponent = forwardRef<
  HTMLAnchorElement,
  NewMantineNavLinkProps
>((props, ref): JSX.Element => {
  return <MantineNavLink ref={ref} {...props} />;
});

const MantineRouterNavLink = createLink(MantineNavLinkComponent);

/**
 * This is a Mantine NavLink that works with our router.
 */
// eslint-disable-next-line react/function-component-definition
export const NavLink: LinkComponent<typeof MantineRouterNavLink> = (props) => {
  const [isClicked, setIsClicked] = useState(false);
  const { hovered, ref: hoverRef } = useHover();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const mergedRef = useMergedRef(linkRef, hoverRef);
  const theme = useMantineTheme();
  const { onClick, style, inactiveHoverColor, ...rest } = props;

  // Reset click state after animation frame to allow for smooth transition.
  // We need this approach because we can't detect `data-status` changes after
  // a click event if we don't trigger a re-render after the `data-status`
  // gets set.
  useEffect(() => {
    if (isClicked) {
      const timer = requestAnimationFrame(() => {
        setIsClicked(false);
      });
      return () => {
        cancelAnimationFrame(timer);
      };
    }
    return noop;
  }, [isClicked]);

  // We need to check both `data-status` and `isClicked` because `data-status`
  // might not update immediately
  const isActive = isClicked || linkRef.current?.dataset?.status === "active";

  // Mantine NavLinks do not provide a way to override the hover color of an
  // inactive link, so we have to do it ourselves using `useHover`,
  // `data-status` and overriding the `style` object.
  const inactiveHoverColorHex = useMemo(() => {
    if (!inactiveHoverColor) {
      return undefined;
    }
    const [color, shade] = inactiveHoverColor.split(".");
    if (color && theme.colors[color]) {
      const themeColors = theme.colors[color];
      if (shade) {
        return themeColors[Number(shade)];
      }

      const primaryShade =
        typeof Theme.primaryShade === "object" ?
          // TODO(jpsyx): this should handle using the `dark` primary shade if
          // we're in dark mode
          Theme.primaryShade.light
        : undefined;
      return themeColors[primaryShade ?? DEFAULT_PRIMARY_SHADE];
    }
    return inactiveHoverColor;
  }, [inactiveHoverColor, theme]);

  return (
    <MantineRouterNavLink
      ref={mergedRef}
      onClick={(e) => {
        notifyDevAlert("clicked");
        setIsClicked(true);
        onClick?.(e);
      }}
      style={{
        ...style,
        backgroundColor:
          !!inactiveHoverColorHex && hovered && !isActive ?
            inactiveHoverColorHex
          : undefined,
      }}
      {...(rest as Omit<NavLinkProps, "style" | "inactiveHoverColor">)}
    />
  );
};

export type NavLinkProps = LinkComponentProps<typeof MantineRouterNavLink>;
