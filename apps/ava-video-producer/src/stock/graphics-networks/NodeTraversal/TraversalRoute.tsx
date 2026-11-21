import { Route } from "../../graphics-common/Route";
import { getClampedUnitFromValue } from "./getClampedUnitFromValue";
import { getKeyedRouteStepsFromNodes } from "./getKeyedRouteStepsFromNodes";
import { ROUTE_LINE_CUE } from "./NodeTraversal.constants";
import type { TraversalRouteData } from "./NodeTraversal.types";
import type { ReactNode } from "react";

type Props = TraversalRouteData;

/** Renders the traversal route layer for NodeTraversal. */
export function TraversalRoute(options: Readonly<Props>): ReactNode {
  return (
    <>
      {getKeyedRouteStepsFromNodes({
        route: options.route,
        nodes: options.nodes,
      }).map(({ key, from, to, stepOffset }) => {
        return (
          <Route
            key={key}
            from={from}
            to={to}
            progress={getClampedUnitFromValue(options.progress - stepOffset)}
            frame={options.frame}
            at={ROUTE_LINE_CUE}
            color={options.accent}
          />
        );
      })}
    </>
  );
}
