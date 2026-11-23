import { createContext } from "react";

/**
 * The route path the current fixture screen treats as active. AvandarStage
 * provides it for each feature. createLink reads it, so product nav links get
 * data-status="active" without real navigation, and the router shim's
 * useLocation reports it as the current pathname.
 */
export const VideoRouteContext = createContext("/$workspaceSlug/data-explorer");
