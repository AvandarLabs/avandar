import { z } from "zod";

/** Index references must stay within the bounded authored node collection. */
export function validateGraph({
  input,
  context,
}: Readonly<{
  input: Readonly<{
    nodes: Array<{ label: string }>;
    edges: Array<[number, number]>;
    route?: number[];
  }>;
  context: z.RefinementCtx;
}>): void {
  input.edges.forEach(([from, to], index) => {
    if (from >= input.nodes.length || to >= input.nodes.length || from === to) {
      context.addIssue({
        code: "custom",
        path: ["edges", index],
        message: "An edge must connect two distinct authored nodes.",
      });
    }
  });
  input.route?.forEach((node, index, route) => {
    if (
      node >= input.nodes.length ||
      (index > 0 &&
        !input.edges.some(
          ([from, to]) => from === route[index - 1] && to === node,
        ))
    ) {
      context.addIssue({
        code: "custom",
        path: ["route", index],
        message:
          "The route must follow authored directed edges between existing nodes.",
      });
    }
  });
}
