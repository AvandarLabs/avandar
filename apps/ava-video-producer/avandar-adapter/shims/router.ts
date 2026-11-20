import { useContext } from "react";
import { createLink } from "./createLink";
import { VideoRouteContext } from "./VideoRouteContext";

export { createLink } from "./createLink";

/** The fixed route params every fixture screen renders under. */
type VideoRouteParams = { workspaceSlug: string; dashboardId: string };

/** The router location shape the product reads. */
type VideoLocation = { pathname: string };

/** The router handle `useRouter` returns. */
type VideoRouter = {
  navigate: () => void;
  invalidate: () => void;
  state: { location: VideoLocation };
};

/** The product's plain anchor link, routed through `createLink`. */
export const Link = createLink("a");
const _noop = () => {};

/** Always resolves to a no-op; no fixture flow navigates imperatively. */
export const useNavigate = (): (() => void) => {
  return _noop;
};

/**
 * A minimal router handle exposing the same shape the product reads from
 * TanStack Router.
 */
export const useRouter = (): VideoRouter => {
  return {
    navigate: _noop,
    invalidate: _noop,
    state: { location: { pathname: "/" } },
  };
};

/** The fixed route params every fixture screen renders under. */
export const useParams = (): VideoRouteParams => {
  return {
    workspaceSlug: "avandar-labs",
    dashboardId: "video-dashboard",
  };
};

/** No fixture screen reads search params, so this is always empty. */
export const useSearch = (): Record<never, never> => {
  return {};
};

/**
 * The current pathname, driven by `VideoRouteContext` instead of real
 * navigation.
 */
export const useLocation = (): VideoLocation => {
  return { pathname: useContext(VideoRouteContext) };
};

/**
 * The subset of TanStack Router's `useRouterState` actually used: an optional
 * `select` over `{ location }`.
 */
export function useRouterState(options?: {
  select?: (state: { location: VideoLocation }) => unknown;
}): unknown {
  const location = useLocation();
  return options?.select ? options.select({ location }) : { location };
}

/** A minimal match object carrying the same fixed params as `useParams`. */
export const useMatch = (): { params: VideoRouteParams } => {
  return { params: useParams() };
};

/**
 * Returns the same `useParams`/`useSearch` shims a real route API would expose.
 */
export const getRouteApi = (): {
  useParams: typeof useParams;
  useSearch: typeof useSearch;
} => {
  return { useParams, useSearch };
};
