import { createContext, useContext, forwardRef } from "react";
import type { ComponentPropsWithoutRef, MouseEvent, Ref } from "react";

/** Fixture navigation retains the product's actual link components and active styles. */
export const VideoRouteContext = createContext("/$workspaceSlug/data-explorer");

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

/** Builds a product-shaped link component whose `data-status` reflects `VideoRouteContext`, with no real navigation. */
export const createLink = (Component: React.ElementType) =>
  forwardRef(
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
      const active = useContext(VideoRouteContext);
      return (
        <Component
          {...rest}
          ref={ref}
          href="#"
          data-status={active === to ? "active" : undefined}
          onClick={(e: MouseEvent) => e.preventDefault()}
        />
      );
    },
  );

/** The product's plain anchor link, routed through `createLink`. */
export const Link = createLink("a");
const _noop = () => {};

/** Always resolves to a no-op; no fixture flow navigates imperatively. */
export const useNavigate = () => _noop;

/** A minimal router handle exposing the same shape the product reads from TanStack Router. */
export const useRouter = () => ({
  navigate: _noop,
  invalidate: _noop,
  state: { location: { pathname: "/" } },
});

/** The fixed route params every fixture screen renders under. */
export const useParams = () => ({
  workspaceSlug: "avandar-labs",
  dashboardId: "video-dashboard",
});

/** No fixture screen reads search params, so this is always empty. */
export const useSearch = () => ({});

/** The current pathname, driven by `VideoRouteContext` instead of real navigation. */
export const useLocation = () => ({ pathname: useContext(VideoRouteContext) });

/** The subset of TanStack Router's `useRouterState` actually used: an optional `select` over `{ location }`. */
export function useRouterState(options?: {
  select?: (state: { location: { pathname: string } }) => unknown;
}) {
  const location = useLocation();
  return options?.select ? options.select({ location }) : { location };
}

/** A minimal match object carrying the same fixed params as `useParams`. */
export const useMatch = () => ({ params: useParams() });

/** Returns the same `useParams`/`useSearch` shims a real route API would expose. */
export const getRouteApi = () => ({ useParams, useSearch });
