import { forwardRef, useContext } from "react";
import { VideoRouteContext } from "./VideoRouteContext";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  ForwardRefExoticComponent,
  MouseEvent,
  PropsWithoutRef,
  Ref,
  RefAttributes,
} from "react";

type LinkRouterProps = {
  to?: string;
  params?: unknown;
  search?: unknown;
  activeOptions?: unknown;
  activeProps?: unknown;
  inactiveProps?: unknown;
  preload?: unknown;
  replace?: boolean;
};

/** The link component `createLink` builds around any element type. */
type VideoLinkComponent = ForwardRefExoticComponent<
  PropsWithoutRef<ComponentPropsWithoutRef<ElementType> & LinkRouterProps> &
    RefAttributes<HTMLElement>
>;

/**
 * Builds a product-shaped link component whose `data-status` reflects
 * `VideoRouteContext`, with no real navigation.
 */
export function createLink(Component: ElementType): VideoLinkComponent {
  return forwardRef(
    (
      {
        to,
        params: _params,
        search: _search,
        activeOptions: _activeOptions,
        activeProps: _activeProps,
        inactiveProps: _inactiveProps,
        preload: _preload,
        replace: _replace,
        ...rest
      }: ComponentPropsWithoutRef<typeof Component> & LinkRouterProps,
      ref: Ref<HTMLElement>,
    ) => {
      const activeRoutePath = useContext(VideoRouteContext);
      return (
        <Component
          {...rest}
          ref={ref}
          href="#"
          data-status={activeRoutePath === to ? "active" : undefined}
          onClick={(event: MouseEvent) => {
            return event.preventDefault();
          }}
        />
      );
    },
  );
}
